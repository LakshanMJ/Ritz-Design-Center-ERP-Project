from django.db.models import Q

from marketing.models import ActualPOClubColorway, ActualPOClubCountry, ActualPOClubSize, ActualPOClub, \
    OrderCostingVersion, OrderCountry, OrderSize, POSize
from shared.utils import get_object_or_none, get_object_or_none_dict, get_object_or_none_qs, get_object_or_none_qs_dict


class ActualPOClubColorwayCountrySizeMapper:
    po_club = None
    purchase_orders = None

    def __init__(self, po_club):
        self.po_club = po_club
        self.purchase_orders = self.po_club.get_purchase_orders()

    def map_data(self):
        self.actual_po_club_colorway_map()
        self.actual_po_club_country_map()
        self.actual_po_club_size_map()
        self.automap_size()
        self.automap_country()
        self.automap_colorway()

    def get_costing_and_type(self):
        pre_costing = self.po_club.pre_costing
        marketing_costing = self.po_club.get_marketing_costing()
        return pre_costing, marketing_costing

    # def automap_colorway(self):
    #     club_cws = self.po_club.actualpoclubcolorway_set.all()
    #     pre_costing, marketing_costing = self.get_costing_and_type()

    def automap_colorway(self):
        club_colorways = self.po_club.actualpoclubcolorway_set.all()
        pre_costing, marketing_costing = self.get_costing_and_type()
        for club_colorway in club_colorways:
            if pre_costing:
                pre_costing_colorways = pre_costing.order.get_order_colorways()
                pre_costing_colorway = get_object_or_none_qs_dict(pre_costing_colorways, colorway=club_colorway.colorway_name)
                club_colorway.pre_costing_order_colorway = None
                club_colorway.marketing_order_colorway = None

                if pre_costing_colorway:
                    club_colorway.pre_costing_order_colorway = pre_costing_colorway
                    club_colorway.marketing_order_colorway = pre_costing_colorway.copied_from

                    po_colorways = club_colorway.pocolorway_set.all()
                    po_colorways.update(order_colorway=pre_costing_colorway)

            else:
                marketing_costing_colorways = marketing_costing.order.get_order_colorways()

                marketing_costing_colorway = get_object_or_none_qs_dict(marketing_costing_colorways, colorway=club_colorway.colorway_name)
                club_colorway.pre_costing_order_colorway = None
                club_colorway.marketing_order_colorway = None

                if marketing_costing_colorway:
                    club_colorway.marketing_order_colorway = marketing_costing_colorway
            club_colorway.save()

    def automap_country(self):
        club_countries = self.po_club.actualpoclubcountry_set.all()
        pre_costing, marketing_costing = self.get_costing_and_type()

        for club_country in club_countries:
            if pre_costing:
                pre_costing_countries = pre_costing.order.get_order_countries()
                pre_costing_country = get_object_or_none_qs_dict(pre_costing_countries, country__name=club_country.country_name)
                club_country.pre_costing_order_country = None
                club_country.marketing_order_country = None

                if pre_costing_country:
                    club_country.pre_costing_order_country = pre_costing_country
                    club_country.marketing_order_country = pre_costing_country.copied_from

                    po_countries = club_country.pocountry_set.all()
                    po_countries.update(order_country=pre_costing_country)

            else:
                marketing_costing_countries = marketing_costing.order.get_order_countries()

                marketing_costing_country = get_object_or_none_qs_dict(marketing_costing_countries,country__name=club_country.country_name)
                club_country.pre_costing_order_country = None
                club_country.marketing_order_country = None

                if marketing_costing_country:
                    club_country.marketing_order_country = marketing_costing_country
            club_country.save()

    def automap_size(self):
        club_sizes = self.po_club.actualpoclubsize_set.all()
        pre_costing, marketing_costing = self.get_costing_and_type()

        for club_size in club_sizes:
            if pre_costing:
                pre_costing_sizes = pre_costing.order.get_order_sizes()
                try:
                    pre_costing_size = pre_costing_sizes.get(Q(size__name=club_size.size_name) | Q(size__abbreviation=club_size.size_name))
                except:
                    continue

                club_size.pre_costing_order_size = None
                club_size.marketing_order_size = None

                if pre_costing_size:
                    club_size.pre_costing_order_size = pre_costing_size
                    club_size.marketing_order_size = pre_costing_size.copied_from

                    po_sizes = club_size.posize_set.all()
                    po_sizes.update(order_size=pre_costing_size)

            else:
                marketing_costing_sizes = marketing_costing.order.get_order_sizes()
                try:
                    marketing_costing_size = marketing_costing_sizes.get(Q(size__name=club_size.size_name) | Q(size__abbreviation=club_size.size_name))
                except:
                    continue
                club_size.pre_costing_order_size = None
                club_size.marketing_order_size = None

                if marketing_costing_size:
                    club_size.marketing_order_size = marketing_costing_size
            if club_size.marketing_order_size:
                club_size.sorting_order = club_size.marketing_order_size.size.sorting_order
            club_size.save()



    def actual_po_club_colorway_map(self):
        for purchase_order in self.purchase_orders:
            po_colorways = purchase_order.pocolorway_set.all()
            for po_colorway in po_colorways:
                colorway_name = po_colorway.colorway
                po_club_colorway, created = ActualPOClubColorway.objects.get_or_create(
                    po_club=self.po_club,
                    colorway_name=colorway_name
                )
                po_colorway.po_club_colorway = po_club_colorway
                po_colorway.save()

    def actual_po_club_country_map(self):
        for purchase_order in self.purchase_orders:
            po_countries = purchase_order.pocountry_set.all()
            for po_country in po_countries:
                po_club_country, created = ActualPOClubCountry.objects.get_or_create(
                    po_club=self.po_club,
                    country_name=po_country.po_country_name
                )
                po_country.po_club_country = po_club_country
                po_country.save()

    def actual_po_club_size_map(self):
        for purchase_order in self.purchase_orders:
            po_sizes = purchase_order.posize_set.all()
            for po_size in po_sizes:
                po_club_size, created = ActualPOClubSize.objects.get_or_create(
                    po_club=self.po_club,
                    size_name=po_size.po_size_name
                )
                # po_club_size.sorting_order = po_size.order_size.size.sorting_order
                po_club_size.save()
                po_size.po_club_size = po_club_size
                po_size.save()