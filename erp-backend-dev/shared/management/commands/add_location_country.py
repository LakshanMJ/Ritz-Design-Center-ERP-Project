from django.core.management.base import BaseCommand
from urllib.request import urlopen
from shared.models import LocationCountry
import json

class Command(BaseCommand):
    help = "add location countries"

    def handle(self, *args, **options):
        url = "https://cadatacatalog.state.gov/dataset/4a387c35-29cb-4902-b91d-3da0dc02e4b2/resource/299b3b67-3c09-46a3-9eb7-9d0086581bcb/download/countrytravelinfo.json"
        response = urlopen(url)
        data = json.loads(response.read())

        for item in data:
            #tag = item["tag"]
            country_name = item["geopoliticalarea"]
            iso_code = item.get("iso_code") 
            LocationCountry.objects.get_or_create(name=country_name, iso_code=iso_code)