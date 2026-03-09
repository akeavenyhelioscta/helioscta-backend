from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

from backend.utils import logging_utils, pipeline_run_logger

from backend.src.ice_python import utils

API_SCRAPE_NAME = "balmo_v1_2025_dec_16"

logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

ICE_SYMBOLS: dict[str, dict[str, str]] = {
    "HH_BALMO": {"symbol": "HHD B0-IUS"},
    "TRANSCO_ST85": {"symbol": "TRW B0-IUS"},
    "FGT_Z3": {"symbol": "FTS B0-IUS"},
    "COLUMBIA_GULF (MAINLINE)": {"symbol": "CGR B0-IUS"},
    "ANR_SE_T": {"symbol": "APS B0-IUS"},
    "PINE_PRARIE": {"symbol": "CVK B0-IUS"},
    "TETCO_WLA": {"symbol": "CVP B0-IUS"},
    "HSC": {"symbol": "UCS B0-IUS"},
    "WAHA": {"symbol": "WAS B0-IUS"},
    "NGPL_TXOK": {"symbol": "NTS B0-IUS"},
    "AGT": {"symbol": "ALS B0-IUS"},
    "TETCO_M3": {"symbol": "TSS B0-IUS"},
    "TRANSCO_Z5": {"symbol": "DKS B0-IUS"},
    "TRANSCO_Z5_SOUTH": {"symbol": "T5C B0-IUS"},
    "IROQUOIS_Z2": {"symbol": "IZS B0-IUS"},
    "TRANSCO_Z6_NY": {"symbol": "ZSS B0-IUS"},
    "DOMINION_SOUTH (EASTERN GAS-SOUTH)": {"symbol": "DSS B0-IUS"},
    "SOCAL_CG": {"symbol": "SCS B0-IUS"},
    "PG&E_CG": {"symbol": "PIG B0-IUS"},
    "CIG_MAINLINE": {"symbol": "CRS B0-IUS"},
    "NGPL_MIDCON": {"symbol": "MTS B0-IUS"},
    "MICHCON": {"symbol": "NMS B0-IUS"},
}


def _pull(
    symbol: str,
    data_type: str = "Settle",
    granularity: str = "D",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    date_col: str = utils.DEFAULT_DATE_COLUMN,
    date_format: str = utils.DEFAULT_DATE_FORMAT,
) -> pd.DataFrame:
    return utils.get_timeseries(
        symbol=symbol,
        data_type=data_type,
        granularity=granularity,
        start_date=start_date,
        end_date=end_date,
        date_col=date_col,
        date_format=date_format,
    )


def _format(
    df: pd.DataFrame,
    date_col: str = utils.DEFAULT_DATE_COLUMN,
    date_format: str = utils.DEFAULT_DATE_FORMAT,
) -> pd.DataFrame:
    return utils.format_timeseries(
        df=df,
        date_col=date_col,
        date_format=date_format,
    )


def _upsert(
    df: pd.DataFrame,
    database: str = utils.DEFAULT_DATABASE,
    schema: str = utils.DEFAULT_SCHEMA,
    table_name: str = API_SCRAPE_NAME,
) -> None:
    utils.upsert_timeseries(
        df=df,
        database=database,
        schema=schema,
        table_name=table_name,
    )


def main(
    data_type: str = "Settle",
    granularity: str = "D",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    date_col: str = utils.DEFAULT_DATE_COLUMN,
    date_format: str = utils.DEFAULT_DATE_FORMAT,
) -> pd.DataFrame:
    start_date = start_date or utils.default_start_date()
    end_date = end_date or utils.default_end_date()

    run = pipeline_run_logger.PipelineRunLogger(
        pipeline_name=API_SCRAPE_NAME,
        source="ice_python",
        target_table=f"{utils.DEFAULT_SCHEMA}.{API_SCRAPE_NAME}",
        operation_type="upsert",
        log_file_path=logger.log_file_path,
    )
    run.start()

    frames: list[pd.DataFrame] = []
    total_rows = 0
    processed_symbols = 0
    try:
        logger.header(API_SCRAPE_NAME)
        for market_name, config in ICE_SYMBOLS.items():
            symbol = config["symbol"]
            logger.section(f"Pulling {market_name}: {symbol}")

            df = _pull(
                symbol=symbol,
                data_type=data_type,
                granularity=granularity,
                start_date=start_date,
                end_date=end_date,
                date_col=date_col,
                date_format=date_format,
            )
            df = _format(df=df, date_col=date_col, date_format=date_format)

            if df.empty:
                logger.warning(f"No data returned for {market_name} ({symbol})")
                continue

            _upsert(df=df, table_name=API_SCRAPE_NAME)
            frames.append(df)
            total_rows += len(df)
            processed_symbols += 1

        run.success(
            rows_processed=total_rows,
            metadata={
                "symbols_processed": processed_symbols,
                "symbols_requested": len(ICE_SYMBOLS),
            },
        )
        return utils.combine_frames(frames, date_col=date_col)

    except Exception as exc:
        logger.exception(f"Pipeline failed: {exc}")
        run.failure(error=exc)
        raise

    finally:
        logging_utils.close_logging()


if __name__ == "__main__":
    main()

