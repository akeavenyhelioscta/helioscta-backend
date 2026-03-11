"""
Prefect flow definitions for gas EBB scrapers.

Each flow wraps a pipeline scraper's main() function.
Entrypoints in prefect.yaml point here instead of the scripts directly.
"""

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from prefect import flow

from backend.src.gas_ebbs.base_scraper import create_scraper


def _run_scraper(source_family: str, pipeline_name: str, **kwargs):
    """Create and run a scraper for the given family/pipeline."""
    scraper = create_scraper(source_family, pipeline_name)
    return scraper.main()


# -- Bhegts family ------------------------------------------------------


@flow(name="gas_ebb_bhegts_carolina_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_bhegts_carolina_gas(**kwargs):
    return _run_scraper("bhegts", "carolina_gas", **kwargs)


@flow(name="gas_ebb_bhegts_cove_point", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_bhegts_cove_point(**kwargs):
    return _run_scraper("bhegts", "cove_point", **kwargs)


@flow(name="gas_ebb_bhegts_eastern_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_bhegts_eastern_gas(**kwargs):
    return _run_scraper("bhegts", "eastern_gas", **kwargs)



# -- Cheniere family ----------------------------------------------------


@flow(name="gas_ebb_cheniere_corpus_christi", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_cheniere_corpus_christi(**kwargs):
    return _run_scraper("cheniere", "corpus_christi", **kwargs)


@flow(name="gas_ebb_cheniere_creole_trail", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_cheniere_creole_trail(**kwargs):
    return _run_scraper("cheniere", "creole_trail", **kwargs)


@flow(name="gas_ebb_cheniere_midship", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_cheniere_midship(**kwargs):
    return _run_scraper("cheniere", "midship", **kwargs)



# -- Dtmidstream family -------------------------------------------------


@flow(name="gas_ebb_dtmidstream_guardian", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_dtmidstream_guardian(**kwargs):
    return _run_scraper("dtmidstream", "guardian", **kwargs)


@flow(name="gas_ebb_dtmidstream_midwestern", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_dtmidstream_midwestern(**kwargs):
    return _run_scraper("dtmidstream", "midwestern", **kwargs)


@flow(name="gas_ebb_dtmidstream_viking", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_dtmidstream_viking(**kwargs):
    return _run_scraper("dtmidstream", "viking", **kwargs)



# -- Enbridge family ----------------------------------------------------


@flow(name="gas_ebb_enbridge_algonquin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_algonquin(**kwargs):
    return _run_scraper("enbridge", "algonquin", **kwargs)


@flow(name="gas_ebb_enbridge_big_sandy", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_big_sandy(**kwargs):
    return _run_scraper("enbridge", "big_sandy", **kwargs)


@flow(name="gas_ebb_enbridge_bobcat_gas_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_bobcat_gas_storage(**kwargs):
    return _run_scraper("enbridge", "bobcat_gas_storage", **kwargs)


@flow(name="gas_ebb_enbridge_east_tennessee", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_east_tennessee(**kwargs):
    return _run_scraper("enbridge", "east_tennessee", **kwargs)


@flow(name="gas_ebb_enbridge_egan_hub", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_egan_hub(**kwargs):
    return _run_scraper("enbridge", "egan_hub", **kwargs)


@flow(name="gas_ebb_enbridge_garden_banks", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_garden_banks(**kwargs):
    return _run_scraper("enbridge", "garden_banks", **kwargs)


@flow(name="gas_ebb_enbridge_maritimes_northeast", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_maritimes_northeast(**kwargs):
    return _run_scraper("enbridge", "maritimes_northeast", **kwargs)


@flow(name="gas_ebb_enbridge_mississippi_canyon", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_mississippi_canyon(**kwargs):
    return _run_scraper("enbridge", "mississippi_canyon", **kwargs)


@flow(name="gas_ebb_enbridge_moss_bluff", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_moss_bluff(**kwargs):
    return _run_scraper("enbridge", "moss_bluff", **kwargs)


@flow(name="gas_ebb_enbridge_nautilus", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_nautilus(**kwargs):
    return _run_scraper("enbridge", "nautilus", **kwargs)


@flow(name="gas_ebb_enbridge_nexus", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_nexus(**kwargs):
    return _run_scraper("enbridge", "nexus", **kwargs)


@flow(name="gas_ebb_enbridge_sabal_trail", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_sabal_trail(**kwargs):
    return _run_scraper("enbridge", "sabal_trail", **kwargs)


@flow(name="gas_ebb_enbridge_saltville", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_saltville(**kwargs):
    return _run_scraper("enbridge", "saltville", **kwargs)


@flow(name="gas_ebb_enbridge_southeast_supply", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_southeast_supply(**kwargs):
    return _run_scraper("enbridge", "southeast_supply", **kwargs)


@flow(name="gas_ebb_enbridge_steckman_ridge", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_steckman_ridge(**kwargs):
    return _run_scraper("enbridge", "steckman_ridge", **kwargs)


@flow(name="gas_ebb_enbridge_texas_eastern", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_texas_eastern(**kwargs):
    return _run_scraper("enbridge", "texas_eastern", **kwargs)


@flow(name="gas_ebb_enbridge_tres_palacios", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_tres_palacios(**kwargs):
    return _run_scraper("enbridge", "tres_palacios", **kwargs)


@flow(name="gas_ebb_enbridge_valley_crossing", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_enbridge_valley_crossing(**kwargs):
    return _run_scraper("enbridge", "valley_crossing", **kwargs)



# -- Energytransfer family ----------------------------------------------


@flow(name="gas_ebb_energytransfer_fayetteville_express", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_fayetteville_express(**kwargs):
    return _run_scraper("energytransfer", "fayetteville_express", **kwargs)


@flow(name="gas_ebb_energytransfer_florida_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_florida_gas(**kwargs):
    return _run_scraper("energytransfer", "florida_gas", **kwargs)


@flow(name="gas_ebb_energytransfer_panhandle_eastern", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_panhandle_eastern(**kwargs):
    return _run_scraper("energytransfer", "panhandle_eastern", **kwargs)


@flow(name="gas_ebb_energytransfer_sea_robin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_sea_robin(**kwargs):
    return _run_scraper("energytransfer", "sea_robin", **kwargs)


@flow(name="gas_ebb_energytransfer_southwest_gas_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_southwest_gas_storage(**kwargs):
    return _run_scraper("energytransfer", "southwest_gas_storage", **kwargs)


@flow(name="gas_ebb_energytransfer_tiger", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_tiger(**kwargs):
    return _run_scraper("energytransfer", "tiger", **kwargs)


@flow(name="gas_ebb_energytransfer_transwestern", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_transwestern(**kwargs):
    return _run_scraper("energytransfer", "transwestern", **kwargs)


@flow(name="gas_ebb_energytransfer_trunkline_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_trunkline_gas(**kwargs):
    return _run_scraper("energytransfer", "trunkline_gas", **kwargs)


@flow(name="gas_ebb_energytransfer_trunkline_lng", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_energytransfer_trunkline_lng(**kwargs):
    return _run_scraper("energytransfer", "trunkline_lng", **kwargs)



# -- Gasnom family ------------------------------------------------------


@flow(name="gas_ebb_gasnom_cameron_interstate", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_cameron_interstate(**kwargs):
    return _run_scraper("gasnom", "cameron_interstate", **kwargs)


@flow(name="gas_ebb_gasnom_golden_pass", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_golden_pass(**kwargs):
    return _run_scraper("gasnom", "golden_pass", **kwargs)


@flow(name="gas_ebb_gasnom_golden_triangle", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_golden_triangle(**kwargs):
    return _run_scraper("gasnom", "golden_triangle", **kwargs)


@flow(name="gas_ebb_gasnom_la_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_la_storage(**kwargs):
    return _run_scraper("gasnom", "la_storage", **kwargs)


@flow(name="gas_ebb_gasnom_mississippi_hub", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_mississippi_hub(**kwargs):
    return _run_scraper("gasnom", "mississippi_hub", **kwargs)


@flow(name="gas_ebb_gasnom_southern_pines", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gasnom_southern_pines(**kwargs):
    return _run_scraper("gasnom", "southern_pines", **kwargs)



# -- Kindermorgan family ------------------------------------------------


@flow(name="gas_ebb_kindermorgan_arlington_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_arlington_storage(**kwargs):
    return _run_scraper("kindermorgan", "arlington_storage", **kwargs)


@flow(name="gas_ebb_kindermorgan_cheyenne_plains", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_cheyenne_plains(**kwargs):
    return _run_scraper("kindermorgan", "cheyenne_plains", **kwargs)


@flow(name="gas_ebb_kindermorgan_colorado_interstate_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_colorado_interstate_gas(**kwargs):
    return _run_scraper("kindermorgan", "colorado_interstate_gas", **kwargs)


@flow(name="gas_ebb_kindermorgan_el_paso_natural_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_el_paso_natural_gas(**kwargs):
    return _run_scraper("kindermorgan", "el_paso_natural_gas", **kwargs)


@flow(name="gas_ebb_kindermorgan_elba_express", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_elba_express(**kwargs):
    return _run_scraper("kindermorgan", "elba_express", **kwargs)


@flow(name="gas_ebb_kindermorgan_horizon_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_horizon_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "horizon_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_kinder_morgan_illinois_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_kinder_morgan_illinois_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "kinder_morgan_illinois_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_kinder_morgan_louisiana_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_kinder_morgan_louisiana_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "kinder_morgan_louisiana_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_midcontinent_express", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_midcontinent_express(**kwargs):
    return _run_scraper("kindermorgan", "midcontinent_express", **kwargs)


@flow(name="gas_ebb_kindermorgan_mojave_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_mojave_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "mojave_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_natural_gas_pipeline_of_america", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_natural_gas_pipeline_of_america(**kwargs):
    return _run_scraper("kindermorgan", "natural_gas_pipeline_of_america", **kwargs)


@flow(name="gas_ebb_kindermorgan_sierrita_gas_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_sierrita_gas_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "sierrita_gas_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_southern_lng", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_southern_lng(**kwargs):
    return _run_scraper("kindermorgan", "southern_lng", **kwargs)


@flow(name="gas_ebb_kindermorgan_southern_natural_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_southern_natural_gas(**kwargs):
    return _run_scraper("kindermorgan", "southern_natural_gas", **kwargs)


@flow(name="gas_ebb_kindermorgan_stagecoach", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_stagecoach(**kwargs):
    return _run_scraper("kindermorgan", "stagecoach", **kwargs)


@flow(name="gas_ebb_kindermorgan_tennessee_gas_pipeline", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_tennessee_gas_pipeline(**kwargs):
    return _run_scraper("kindermorgan", "tennessee_gas_pipeline", **kwargs)


@flow(name="gas_ebb_kindermorgan_transcolorado", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_transcolorado(**kwargs):
    return _run_scraper("kindermorgan", "transcolorado", **kwargs)


@flow(name="gas_ebb_kindermorgan_wyoming_interstate", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_wyoming_interstate(**kwargs):
    return _run_scraper("kindermorgan", "wyoming_interstate", **kwargs)


@flow(name="gas_ebb_kindermorgan_young_gas_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_kindermorgan_young_gas_storage(**kwargs):
    return _run_scraper("kindermorgan", "young_gas_storage", **kwargs)



# -- Northern Natural family --------------------------------------------


@flow(name="gas_ebb_northern_natural_northern_natural", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_northern_natural_northern_natural(**kwargs):
    return _run_scraper("northern_natural", "northern_natural", **kwargs)



# -- Piperiv family -----------------------------------------------------


@flow(name="gas_ebb_algonquin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_algonquin(**kwargs):
    return _run_scraper("piperiv", "algonquin", **kwargs)


@flow(name="gas_ebb_anr", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_anr(**kwargs):
    return _run_scraper("piperiv", "anr", **kwargs)


@flow(name="gas_ebb_columbia_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_columbia_gas(**kwargs):
    return _run_scraper("piperiv", "columbia_gas", **kwargs)


@flow(name="gas_ebb_el_paso", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_el_paso(**kwargs):
    return _run_scraper("piperiv", "el_paso", **kwargs)


@flow(name="gas_ebb_florida_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_florida_gas(**kwargs):
    return _run_scraper("piperiv", "florida_gas", **kwargs)


@flow(name="gas_ebb_gulf_south", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_gulf_south(**kwargs):
    return _run_scraper("piperiv", "gulf_south", **kwargs)


@flow(name="gas_ebb_iroquois", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_iroquois(**kwargs):
    return _run_scraper("piperiv", "iroquois", **kwargs)


@flow(name="gas_ebb_millennium", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_millennium(**kwargs):
    return _run_scraper("piperiv", "millennium", **kwargs)


@flow(name="gas_ebb_mountain_valley", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_mountain_valley(**kwargs):
    return _run_scraper("piperiv", "mountain_valley", **kwargs)


@flow(name="gas_ebb_northern_natural", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_northern_natural(**kwargs):
    return _run_scraper("piperiv", "northern_natural", **kwargs)


@flow(name="gas_ebb_northwest", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_northwest(**kwargs):
    return _run_scraper("piperiv", "northwest", **kwargs)


@flow(name="gas_ebb_panhandle_eastern", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_panhandle_eastern(**kwargs):
    return _run_scraper("piperiv", "panhandle_eastern", **kwargs)


@flow(name="gas_ebb_rover", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_rover(**kwargs):
    return _run_scraper("piperiv", "rover", **kwargs)


@flow(name="gas_ebb_southeast_supply", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_southeast_supply(**kwargs):
    return _run_scraper("piperiv", "southeast_supply", **kwargs)



# -- Quorum family ------------------------------------------------------


@flow(name="gas_ebb_quorum_bbt_alatenn", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_bbt_alatenn(**kwargs):
    return _run_scraper("quorum", "bbt_alatenn", **kwargs)


@flow(name="gas_ebb_quorum_bbt_midla", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_bbt_midla(**kwargs):
    return _run_scraper("quorum", "bbt_midla", **kwargs)


@flow(name="gas_ebb_quorum_bbt_trans_union", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_bbt_trans_union(**kwargs):
    return _run_scraper("quorum", "bbt_trans_union", **kwargs)


@flow(name="gas_ebb_quorum_chandeleur", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_chandeleur(**kwargs):
    return _run_scraper("quorum", "chandeleur", **kwargs)


@flow(name="gas_ebb_quorum_destin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_destin(**kwargs):
    return _run_scraper("quorum", "destin", **kwargs)


@flow(name="gas_ebb_quorum_high_point", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_high_point(**kwargs):
    return _run_scraper("quorum", "high_point", **kwargs)


@flow(name="gas_ebb_quorum_ozark_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_quorum_ozark_gas(**kwargs):
    return _run_scraper("quorum", "ozark_gas", **kwargs)



# -- Standalone family --------------------------------------------------


@flow(name="gas_ebb_standalone_alliance", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_alliance(**kwargs):
    return _run_scraper("standalone", "alliance", **kwargs)


@flow(name="gas_ebb_standalone_black_marlin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_black_marlin(**kwargs):
    return _run_scraper("standalone", "black_marlin", **kwargs)


@flow(name="gas_ebb_standalone_boardwalk_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_boardwalk_storage(**kwargs):
    return _run_scraper("standalone", "boardwalk_storage", **kwargs)


@flow(name="gas_ebb_standalone_dcp_cimarron", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_dcp_cimarron(**kwargs):
    return _run_scraper("standalone", "dcp_cimarron", **kwargs)


@flow(name="gas_ebb_standalone_dcp_dauphin", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_dcp_dauphin(**kwargs):
    return _run_scraper("standalone", "dcp_dauphin", **kwargs)


@flow(name="gas_ebb_standalone_empire", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_empire(**kwargs):
    return _run_scraper("standalone", "empire", **kwargs)


@flow(name="gas_ebb_standalone_enable_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_enable_gas(**kwargs):
    return _run_scraper("standalone", "enable_gas", **kwargs)


@flow(name="gas_ebb_standalone_enable_mrt", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_enable_mrt(**kwargs):
    return _run_scraper("standalone", "enable_mrt", **kwargs)


@flow(name="gas_ebb_standalone_enterprise_hios", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_enterprise_hios(**kwargs):
    return _run_scraper("standalone", "enterprise_hios", **kwargs)


@flow(name="gas_ebb_standalone_enterprise_petal", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_enterprise_petal(**kwargs):
    return _run_scraper("standalone", "enterprise_petal", **kwargs)


@flow(name="gas_ebb_standalone_florida_southeast", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_florida_southeast(**kwargs):
    return _run_scraper("standalone", "florida_southeast", **kwargs)


@flow(name="gas_ebb_standalone_gulf_south", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_gulf_south(**kwargs):
    return _run_scraper("standalone", "gulf_south", **kwargs)


@flow(name="gas_ebb_standalone_iroquois", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_iroquois(**kwargs):
    return _run_scraper("standalone", "iroquois", **kwargs)


@flow(name="gas_ebb_standalone_kern_river", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_kern_river(**kwargs):
    return _run_scraper("standalone", "kern_river", **kwargs)


@flow(name="gas_ebb_standalone_ko_transmission", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_ko_transmission(**kwargs):
    return _run_scraper("standalone", "ko_transmission", **kwargs)


@flow(name="gas_ebb_standalone_mountainwest", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_mountainwest(**kwargs):
    return _run_scraper("standalone", "mountainwest", **kwargs)


@flow(name="gas_ebb_standalone_mountainwest_overthrust", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_mountainwest_overthrust(**kwargs):
    return _run_scraper("standalone", "mountainwest_overthrust", **kwargs)


@flow(name="gas_ebb_standalone_national_fuel", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_national_fuel(**kwargs):
    return _run_scraper("standalone", "national_fuel", **kwargs)


@flow(name="gas_ebb_standalone_oneok_oktex", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_oneok_oktex(**kwargs):
    return _run_scraper("standalone", "oneok_oktex", **kwargs)


@flow(name="gas_ebb_standalone_paiute", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_paiute(**kwargs):
    return _run_scraper("standalone", "paiute", **kwargs)


@flow(name="gas_ebb_standalone_sabine", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_sabine(**kwargs):
    return _run_scraper("standalone", "sabine", **kwargs)


@flow(name="gas_ebb_standalone_southern_star", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_southern_star(**kwargs):
    return _run_scraper("standalone", "southern_star", **kwargs)


@flow(name="gas_ebb_standalone_stingray", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_stingray(**kwargs):
    return _run_scraper("standalone", "stingray", **kwargs)


@flow(name="gas_ebb_standalone_texas_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_texas_gas(**kwargs):
    return _run_scraper("standalone", "texas_gas", **kwargs)


@flow(name="gas_ebb_standalone_vector", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_vector(**kwargs):
    return _run_scraper("standalone", "vector", **kwargs)


@flow(name="gas_ebb_standalone_wbi_energy", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_wbi_energy(**kwargs):
    return _run_scraper("standalone", "wbi_energy", **kwargs)


@flow(name="gas_ebb_standalone_westgas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_westgas(**kwargs):
    return _run_scraper("standalone", "westgas", **kwargs)


@flow(name="gas_ebb_standalone_white_river_hub", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_standalone_white_river_hub(**kwargs):
    return _run_scraper("standalone", "white_river_hub", **kwargs)



# -- Tallgrass family ---------------------------------------------------


@flow(name="gas_ebb_tallgrass_rockies_express", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tallgrass_rockies_express(**kwargs):
    return _run_scraper("tallgrass", "rockies_express", **kwargs)


@flow(name="gas_ebb_tallgrass_ruby", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tallgrass_ruby(**kwargs):
    return _run_scraper("tallgrass", "ruby", **kwargs)


@flow(name="gas_ebb_tallgrass_tallgrass_interstate", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tallgrass_tallgrass_interstate(**kwargs):
    return _run_scraper("tallgrass", "tallgrass_interstate", **kwargs)


@flow(name="gas_ebb_tallgrass_trailblazer", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tallgrass_trailblazer(**kwargs):
    return _run_scraper("tallgrass", "trailblazer", **kwargs)



# -- Tce family ---------------------------------------------------------


@flow(name="gas_ebb_tce_anr", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_anr(**kwargs):
    return _run_scraper("tce", "anr", **kwargs)


@flow(name="gas_ebb_tce_anr_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_anr_storage(**kwargs):
    return _run_scraper("tce", "anr_storage", **kwargs)


@flow(name="gas_ebb_tce_bison", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_bison(**kwargs):
    return _run_scraper("tce", "bison", **kwargs)


@flow(name="gas_ebb_tce_blue_lake", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_blue_lake(**kwargs):
    return _run_scraper("tce", "blue_lake", **kwargs)


@flow(name="gas_ebb_tce_columbia_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_columbia_gas(**kwargs):
    return _run_scraper("tce", "columbia_gas", **kwargs)


@flow(name="gas_ebb_tce_columbia_gulf", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_columbia_gulf(**kwargs):
    return _run_scraper("tce", "columbia_gulf", **kwargs)


@flow(name="gas_ebb_tce_crossroads", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_crossroads(**kwargs):
    return _run_scraper("tce", "crossroads", **kwargs)


@flow(name="gas_ebb_tce_hardy_storage", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_hardy_storage(**kwargs):
    return _run_scraper("tce", "hardy_storage", **kwargs)


@flow(name="gas_ebb_tce_millennium", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_millennium(**kwargs):
    return _run_scraper("tce", "millennium", **kwargs)


@flow(name="gas_ebb_tce_northern_border", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_northern_border(**kwargs):
    return _run_scraper("tce", "northern_border", **kwargs)


@flow(name="gas_ebb_tce_portland_natural_gas", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tce_portland_natural_gas(**kwargs):
    return _run_scraper("tce", "portland_natural_gas", **kwargs)



# -- Tcplus family ------------------------------------------------------


@flow(name="gas_ebb_tcplus_great_lakes", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tcplus_great_lakes(**kwargs):
    return _run_scraper("tcplus", "great_lakes", **kwargs)


@flow(name="gas_ebb_tcplus_gtn", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tcplus_gtn(**kwargs):
    return _run_scraper("tcplus", "gtn", **kwargs)


@flow(name="gas_ebb_tcplus_north_baja", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tcplus_north_baja(**kwargs):
    return _run_scraper("tcplus", "north_baja", **kwargs)


@flow(name="gas_ebb_tcplus_tuscarora", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_tcplus_tuscarora(**kwargs):
    return _run_scraper("tcplus", "tuscarora", **kwargs)



# -- Williams family ----------------------------------------------------


@flow(name="gas_ebb_williams_discovery", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_williams_discovery(**kwargs):
    return _run_scraper("williams", "discovery", **kwargs)


@flow(name="gas_ebb_williams_gulfstream", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_williams_gulfstream(**kwargs):
    return _run_scraper("williams", "gulfstream", **kwargs)


@flow(name="gas_ebb_williams_northwest", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_williams_northwest(**kwargs):
    return _run_scraper("williams", "northwest", **kwargs)


@flow(name="gas_ebb_williams_pine_needle", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_williams_pine_needle(**kwargs):
    return _run_scraper("williams", "pine_needle", **kwargs)


@flow(name="gas_ebb_williams_transco", retries=2, retry_delay_seconds=60, log_prints=True)
def gas_ebb_williams_transco(**kwargs):
    return _run_scraper("williams", "transco", **kwargs)



# -- All pipelines --------------------------------------------------


@flow(name="gas_ebb_all", retries=0, log_prints=True)
def gas_ebb_all(**kwargs):
    """Run all configured gas EBB scrapers sequentially."""
    from backend.src.gas_ebbs.base_scraper import discover_all_pipelines

    pipelines = discover_all_pipelines()
    results = []
    for name, family, _ in pipelines:
        try:
            result = _run_scraper(family, name, **kwargs)
            results.append((name, len(result) if result else 0, None))
        except Exception as e:
            results.append((name, 0, str(e)))
    return results
