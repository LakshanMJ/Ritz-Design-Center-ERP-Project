from shared.models import OtherCost


def import_other_costs():
    data = [
        'Testing',
        'Clearing & Forwarding',
        'Courier Cost',
        'MOQ/ MCQ',
        'Development'
    ]

    for row in data:
        OtherCost.objects.get_or_create(name=row)