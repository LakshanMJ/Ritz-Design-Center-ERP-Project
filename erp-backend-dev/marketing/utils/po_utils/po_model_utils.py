from marketing.constants.costing_constants import MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES


def get_consumption_and_wastage_combination(wastage, consumption_ratio):
    ratio_total = 0
    if consumption_ratio:
        ratio_total = ratio_total + consumption_ratio
    if wastage:
        ratio_total = ratio_total * (1 + (wastage / 100))
    ratio_total = round(ratio_total, MATERIAL_COSTS_ROUNDING_DECIMAL_PLACES)
    return ratio_total
