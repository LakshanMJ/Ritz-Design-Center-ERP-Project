from rest_framework.serializers import ModelSerializer, Serializer
from rest_framework import serializers

from marketing.models import ActualPOClubColorway, ActualPOClubCountry, ActualPOClubSize, POPackItemPlacement, \
    POPackPlacement


class ConsumptionWastageSerializer(Serializer):
    wastage = serializers.FloatField(required=True)
    consumption_ratio = serializers.FloatField(required=True)