from marketing.models import OrderCostingVersion


def fix_costings():
    costings = OrderCostingVersion.objects.all()

    print("Before running script complete state costings", list(costings.filter(version_state=OrderCostingVersion.COMPLETED_VERSION_STATE).values_list('pk', flat=True)))
    for costing in costings:
        if costing.version_state in [OrderCostingVersion.COMPLETED_VERSION_STATE, OrderCostingVersion.PENDING_SUPPLIER_SELECTION_VERSION_STATE]:
            try:
                changed_state = False
                if OrderCostingVersion.COMPLETED_VERSION_STATE:
                    costing.version_state = OrderCostingVersion.PENDING_SUPPLIER_SELECTION_VERSION_STATE
                    costing.save()
                    changed_state = True
                costing.recalculate_all_pack_costs_and_normalized_costs()
                if changed_state:
                    costing.version_state = OrderCostingVersion.COMPLETED_VERSION_STATE
                    costing.save()
            except Exception as ex:
                print(f"ERROR FOR {costing.pk}")
                print(repr(ex))
    print("After running script complete state costings", list(OrderCostingVersion.objects.filter(version_state=OrderCostingVersion.COMPLETED_VERSION_STATE).values_list('pk', flat=True)))
