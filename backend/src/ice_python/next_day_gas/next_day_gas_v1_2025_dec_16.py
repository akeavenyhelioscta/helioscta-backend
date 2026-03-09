from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

from backend.utils import logging_utils, pipeline_run_logger

from backend.src.ice_python import utils

API_SCRAPE_NAME = "next_day_gas_v1_2025_dec_16"

logger = logging_utils.init_logging(
    name=API_SCRAPE_NAME,
    log_dir=Path(__file__).parent / "logs",
    log_to_file=True,
    delete_if_no_errors=True,
)

# NOTE: NG Firm Phys, FP
ICE_SYMBOLS: dict = {
    # LOUISIANA
    'HENRY_HUB': {'symbol': 'XGF D1-IPG'},
    
    # SOUTHEAST
    'TRANSCO_ST85': {'symbol': 'XVA D1-IPG'},
    'FGT_Z3': {'symbol': 'YHV D1-IPG'},
    'COLUMBIA_GULF (MAINLINE)': {'symbol': 'XLA D1-IPG'},
    'ANR_SE_T': {'symbol': 'XTA D1-IPG'},
    'PINE_PRARIE': {'symbol': 'YV7 D1-IPG'},
    'TETCO_WLA': {'symbol': 'XT6 D1-IPG'},

    # EAST TEXAS
    'HSC': {'symbol': 'XYZ D1-IPG'},
    'WAHA': {'symbol': 'XT6 D1-IPG'},
    'NGPL_TXOK': {'symbol': 'XIT D1-IPG'},

    # NORTHEAST
    ### TODO: not working from ICE
    ### 'AGT_CG': {'symbol': 'YI0 D1-IPG'},       # NOTE: Algonquin Citygates Algonquin Citygates (Excluding J-Lateral deliveries)
    'AGT_CG (non-G)': {'symbol': 'X7F D1-IPG'},   # NOTE: Algonquin Citygates (Excluding J-Lateral and G-Lateral deliveries and Brookfield)
    'TETCO_M3': {'symbol': 'XZR D1-IPG'},
    'TRANSCO_Z5_SOUTH': {'symbol': 'YFF D1-IPG'},
    'TRANSCO_Z5_NORTH': {'symbol': 'Z2Y D1-IPG'},
    'IROQUOIS_Z2': {'symbol': 'YP8 D1-IPG'},
    'TRANSCO_Z6_NY': {'symbol': 'XWK D1-IPG'},
    'DOMINION_SOUTH (EASTERN GAS-SOUTH)': {'symbol': 'XJL D1-IPG'},

    # Southwest
    'SOCAL_CG': {'symbol': 'XKF D1-IPG'},
    'PG&E_CG': {'symbol': 'XGV D1-IPG'},

    # Rockies/Northwest
    'CIG_MAINLINE': {'symbol': 'YKL D1-IPG'},  # NOTE: Colorado Interstate Gas Company - Mainline (sellers' choice non-lateral from Muddy Creek to Cheyenne, excluding pool gas) 
    
    # Midwest
    'NGPL_MIDCON': {'symbol': 'XJR D1-IPG'},
    'MICHCON': {'symbol': 'XJZ D1-IPG'},
}

"""
"""

def _pull(
    symbol: str,
    data_type: str = "VWAP Close",
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
    data_type: str = "VWAP Close",
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

