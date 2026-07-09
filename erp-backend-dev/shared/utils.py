import base64
import decimal
import math

from django.core.exceptions import ObjectDoesNotExist, FieldDoesNotExist
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
import random
import datetime

from materials.fieldmetadata.measuring_unit_helpers import MaterialUnitHelper, PerMeasuringUnitHelper
from shared.helpers.currency_helper import CurrencyHelper
from django.db.models import Q
from django.db.models.functions import Cast
from django.db import models

ID_FIELD_TYPE = 'id'
TEXT_FIELD_TYPE = 'text'
CHOICE_FIELD_TYPE = 'choice'
BOOLEAN_FIELD_TYPE = 'boolean'
DATE_FIELD_TYPE = 'date'


class Pagination(PageNumberPagination):
    max_page_size = 100

    def get_page_size(self, request):
        page_size = request.query_params.get('page_size')
        if page_size:
            return int(page_size)
        return self.page_size

    def get_paginated_response(self, data):
        return Response({
            'page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'count': self.page.paginator.count,
            'results': data
        })

    def paginate_queryset(self, queryset, request, view=None):
        self.page_size = self.get_page_size(request)  
        queryset = self.apply_sorting(queryset, request)
        queryset = self.apply_search(queryset, request)
        return super().paginate_queryset(queryset, request, view)

    def apply_sorting(self, queryset, request):
        sorting_param = request.query_params.get('sort')
        if sorting_param:
            sort_fields = sorting_param.split(',')
            ordering = [self.get_ordering_field(field) for field in sort_fields]
            queryset = queryset.order_by(*ordering)

        return queryset

    def get_ordering_field(self, field):
        if field.startswith('-'):
            return '-' + field[1:]
        return field

    def apply_search(self, queryset, request):
        search_param = request.query_params.get('search')
        if search_param:
            search_fields = request.query_params.getlist('search_fields')
            for field in search_fields:
                queryset = queryset.filter(**{f"{field}__icontains": search_param})

        return queryset


def get_object_or_none(model, kwargs):
    object = None
    try:
        object = model.objects.get(**kwargs)
    except ObjectDoesNotExist:
        pass
    return object


def get_object_or_none_dict(model, **kwargs):
    object = None
    try:
        object = model.objects.get(**kwargs)
    except ObjectDoesNotExist:
        pass
    return object


def get_object_or_none_qs(qs, kwargs):
    object = None
    try:
        object = qs.get(**kwargs)
    except ObjectDoesNotExist:
        pass
    return object


def get_object_or_none_qs_dict(qs, **kwargs):
    object = None
    try:
        object = qs.get(**kwargs)
    except ObjectDoesNotExist:
        pass
    return object


def make_flat_list_unique(data):
    return list(set(data))


def dict_is_empty(dict):
    keys = dict.keys()
    return len(keys) > 0


def generate_unique_hex(text_value):
    timestamp = int(datetime.datetime.now().timestamp())
    random_hex = hex(random.randint(0, 1000000))
    name_hex = text_value  + "_" + random_hex + hex(timestamp)
    return name_hex


def dictionary_in_list(dict_list, compare_dict):
    contains = False
    for dict in dict_list:
        all_keys_match = True
        for key, value in compare_dict.items():
            if dict[key] != value:
                all_keys_match = False
                break
        if all_keys_match:
            contains = True
    return contains


def get_eav_attribute_data(eav_object, field):
    # print(eav_object, field)
    eav_data = getattr(eav_object, 'user_defined_material_data')
    value = ''
    if eav_data:
        value = eav_data.get(field.name, '')
    return value


def get_eav_dropdown_option_data(field, value):
    dropdown_option = field.get_drop_down_option_object(value)
    display_value = ''
    if dropdown_option:
        display_value = dropdown_option.display_value
    return display_value


def get_eav_field_display_value(field, eav_object):
    from materials.models import UserDefinedMaterialAttribute
    value = get_eav_attribute_data(eav_object, field)
    if field.attribute_type == UserDefinedMaterialAttribute.DROPDOWN_ATTRIBUTE:
        value = get_eav_dropdown_option_data(field, value)
    return value


def remove_spaces_from_string(value_string):
    return "".join(str(value_string).split(" "))


def model_has_field(model, field_name):
    has_field = True
    try:
        model._meta.get_field(field_name)
    except FieldDoesNotExist:
        has_field = False
    return has_field


def base64_encode_string(encode_string):
    encoded_string = base64.b64encode(encode_string.encode()).decode().strip("=")
    return encoded_string


def base64_decode_string(decode_string):
    if not '=' in decode_string:
        decode_string = '='
    decoded_string = base64.b64decode(decode_string).decode()
    return decoded_string


def is_none(value):
    return value == None


def convert_to_float_or_none(value):
    try:
        value = float(value)
    except (TypeError, ValueError) as ex:
        value = None
    return value


def get_float_or_zero(value):
    try:
        value = float(value)
    except TypeError:
        value = 0
    return value


def get_int_or_zero(value):
    try:
        value = int(value)
    except TypeError:
        value = 0
    return value


def round_if_number(value, decimal_points):
    number = value
    try:
        number = round(value, decimal_points)
    except:
        pass
    return number


def ceil_number(value):
    number = None
    try:
        number = float(value)
        number = math.ceil(number)
    except:
        pass
    return number


def calculate_queryset_total_normalized_quantity(queryset, normalized_unit, quantity_field, quantity_unit_field):
    '''
    If the quantity field is None, it takes the value as 0
    '''
    total_quantity = 0
    mh = MaterialUnitHelper()
    for qs_object in queryset:
        quantity_value = getattr(qs_object, quantity_field)
        quantity_unit = getattr(qs_object, quantity_unit_field)
        quantity = get_float_or_zero(quantity_value)
        normalized_quantity = quantity

        if quantity != 0:
            normalized_quantity = mh.convert_to_units(normalized_unit, quantity, quantity_unit)
        total_quantity += normalized_quantity

    return round(total_quantity, 2)


def calculate_queryset_total_normalized_quantity_from_property(queryset, normalized_unit, property_name, quantity_key, quantity_unit_key, raise_exception=True):
    '''
    If the quantity field is None, it takes the value as 0
    '''
    total_quantity = 0
    mh = MaterialUnitHelper()

    for qs_object in queryset:
        qs_data = getattr(qs_object, property_name)
        quantity_value = qs_data[quantity_key]
        quantity_unit = qs_data[quantity_unit_key]

        quantity = get_float_or_zero(quantity_value)
        normalized_quantity = quantity
        if quantity != 0:
            normalized_quantity = mh.convert_to_units(normalized_unit, quantity, quantity_unit, raise_exception)

        total_quantity += normalized_quantity

    return total_quantity


def get_attributes(object, attribute_path_array):
    for attribute in attribute_path_array.split('__'):
        if not object:
            break
        object = object.__getattribute__(attribute)
    return object


def convert_quantity_to_unit(convert_unit, quantity, current_unit):

    mh = MaterialUnitHelper()
    if (quantity == 0 or is_none(quantity)) and is_none(current_unit):
        converted_quantity = 0
    elif (quantity == 0 or is_none(quantity)) and not is_none(current_unit):
        converted_quantity = 0
    else:
        converted_quantity = mh.convert_to_units(convert_unit, quantity, current_unit)
    data = get_quantity_dictionary(converted_quantity, convert_unit)
    return data


def get_quantity_dictionary(quantity, quantity_units):
    mh = MaterialUnitHelper()

    display_value = mh.all_measuring_units_dictionary.get(quantity_units, None)
    data = {
        'quantity': quantity,
        'quantity_units': quantity_units,
        'quantity_units_display': display_value
    }
    return data


def valid_material_unit(unit, unit_category):
    mh = MaterialUnitHelper()
    return mh.valid_material_unit(unit, unit_category)


def add_error_to_dictionary(error_dict, key, value, value_type='list'):
    '''
    :param error_dict:  dictionary to add error to
    :param key: error key
    :param value: error value
    :param value_type: type for the key value - can be string or list
    :return:
    '''

    if value_type == 'list':
        error_value = error_dict.get('key', [])
        error_dict[key] = error_value.append(value)
    else:
        error_dict[key] = value

    return error_dict


def get_display_value_for_unit(unit):
    mh = MaterialUnitHelper()
    return mh.all_measuring_units_dictionary.get(unit, 'N/A')


def get_material_unit_category(unit):
    mh = MaterialUnitHelper()
    return mh.get_normalized_unit_catergory(unit)


def calculate_queryset_total_amount_normalized_amount(queryset, amount_field, currency_field=None, normalize_currency=None):
    total_amount = 0
    for qs_object in queryset:
        amount_value = getattr(qs_object, amount_field)
        amount = get_float_or_zero(amount_value)
        total_amount += amount
    return round(total_amount, 2)


def get_currency_display(currency_code):
    for code, display in CurrencyHelper.CURRENCY_CHOICES:
        if code == currency_code:
            return display
    return None


def get_amount_dictionary(amount, currency=None):
    if not amount:
        amount = 0
    data = {
        'amount': round(amount, 4),
        'amount_currency': CurrencyHelper.USD_CURRENCY,
        'amount_currency_display': get_currency_display(CurrencyHelper.USD_CURRENCY)
    }
    return data

# Meters 100 per cm 100*1000
def convert_per_unit_cost(convert_unit, cost, per_current_unit):
    '''
    :param convert_unit: meters or pieces
    :param cost: current cost
    :param current_unit: current per unit. Example: per_meter, per_piece
    :return:
    '''
    # print("per",per_current_unit == PerMeasuringUnitHelper.PER_PIECE_UNIT, per_current_unit, PerMeasuringUnitHelper.PER_PIECE_UNIT)
    unithelper = MaterialUnitHelper()
    # current_unit = PerMeasuringUnitHelper.PER_CENTIMETER_UNIT
    # convert_unit = PerMeasuringUnitHelper.PER_METER_UNIT
    cost = float(cost)
    unit_category = unithelper.get_normalized_unit_catergory(convert_unit)
    
    if is_none(cost) or is_none(convert_unit) or is_none(per_current_unit):
        cost = None
    elif unit_category == MaterialUnitHelper.MEASURING_UNIT_OF_LENGTH_OPTION and convert_unit == MaterialUnitHelper.METERS_UNIT:
        unit_conversion = unithelper.convert_per_unit_to_unit(per_current_unit)
        unit_conversion_amount = unithelper.get_meter_conversion_amount(unit_conversion)
        cost = cost / unit_conversion_amount
        cost = round(cost, 4)
        convert_unit = PerMeasuringUnitHelper.PER_METER_UNIT
    elif per_current_unit == PerMeasuringUnitHelper.PER_PIECE_UNIT:
        cost = cost
        convert_unit = PerMeasuringUnitHelper.PER_PIECE_UNIT
    else:
        raise Exception("Invalid conversion unit")

    data = {
        'cost': cost,
        'per_cost_unit': convert_unit,
    }
    return data

def convert_search_to_int(search_text):
    try:
        return int(search_text)
    except ValueError:
        return None

def search_qs_from_id(qs, search_text):
    numeric_search = convert_search_to_int(search_text)
    if not numeric_search:
        return qs.order_by('-id')

    filtered_qs = qs.filter(id=numeric_search).distinct().order_by('-id')
    return filtered_qs

def convert_search_text_to_numeric_search(search_text):
    import re
    numeric_search = None
    if search_text:
        if search_text.startswith("CB"):
            match = re.search(r"CB(\d+)", search_text)
            numeric_search = int(match.group(1)) if match else None
        else:
            match = re.search(r'\d+$', search_text)
            numeric_search = int(match.group()) if match else None
    return numeric_search

def clean_search_values(dic):
    for key, value in dic.items():
        if key == 'id' or key.endswith('_id'):
            dic[key] = convert_search_text_to_numeric_search(value)
    return dic

def clean_search_dictionary(dic, replace_keys):
    cleaned_dic = {}
    for k in dic:
        if k in replace_keys:
            cleaned_dic[replace_keys[k]] = dic[k]
    value_cleand_dic = clean_search_values(cleaned_dic)
    return value_cleand_dic

def get_sorted_qs(qs, sort_col, sort_dir):
        sort_prefix = "-" if sort_dir == "desc" else ""
        if sort_col:
            qs = qs.order_by(f"{sort_prefix}{sort_col}")
        return qs

def get_filtered_choice_value_list_from_search_text(choices, search_value):
    search_list = []
    for choice in choices:
        if search_value in choice[0]:
            search_list.append(choice[0])
        elif search_value in choice[1]:
            search_list.append(choice[0])
    return search_list

def get_sort_column_field_name_by_front_end_field_name(field_list, front_end_field_name):
    for field in field_list:
        if field['front_end_field_name'] == front_end_field_name:
            return field['field_name']
    return None

def get_parse_date(date_str):
    parse_date = None
    formats = ["%d/%m/%Y", "%Y-%m-%d"]
    for format in formats:
        try:
            parse_date = datetime.datetime.strptime(date_str, format)
        except ValueError:
            continue
    return parse_date

def get_AND_filter_queries(field_type, field_name, search_value, model):
    filters = Q()

    if field_type == ID_FIELD_TYPE:
        numeric_search = convert_search_text_to_numeric_search(search_value)
        if numeric_search:
            filters &= Q(**{field_name: numeric_search})
        
    elif field_type == TEXT_FIELD_TYPE:
        filters &= Q(**{f"{field_name}__icontains": search_value})

    elif field_type == CHOICE_FIELD_TYPE:
        field = model._meta.get_field(field_name)
        choices = field.choices if hasattr(field, 'choices') else []
        filtered_choices_list = get_filtered_choice_value_list_from_search_text(choices, search_value)
        filters &= Q(**{f"{field_name}__in": filtered_choices_list})

    elif field_type == BOOLEAN_FIELD_TYPE:
        boolean_value = None
        if search_value == 'True':
            boolean_value == True
        elif search_value == 'False':
            boolean_value == False
        filters &= Q(**{f"{field_name}": boolean_value})

    elif field_type == DATE_FIELD_TYPE:
        formatted_date = get_parse_date(search_value)
        filters &= Q(**{f"{field_name}": formatted_date})

    return filters

def get_OR_filter_queries(field_type, field_name, search_value, model):
    filters = Q()

    if field_type == ID_FIELD_TYPE:
        numeric_search = convert_search_text_to_numeric_search(search_value)
        if numeric_search:
            filters |= Q(**{field_name: numeric_search})
        
    elif field_type == TEXT_FIELD_TYPE:
        filters |= Q(**{f"{field_name}__icontains": search_value})

    elif field_type == CHOICE_FIELD_TYPE:
        field = model._meta.get_field(field_name)
        choices = field.choices if hasattr(field, 'choices') else []
        filtered_choices_list = get_filtered_choice_value_list_from_search_text(choices, search_value)
        filters |= Q(**{f"{field_name}__in": filtered_choices_list})

    elif field_type == BOOLEAN_FIELD_TYPE:
        boolean_value = None
        if search_value == 'True':
            boolean_value = True
        elif search_value == 'False':
            boolean_value = False
        filters |= Q(**{f"{field_name}": boolean_value})

    elif field_type == DATE_FIELD_TYPE:
        formatted_date = get_parse_date(search_value)
        filters |= Q(**{f"{field_name}": formatted_date})

    return filters

def search_qs_from_global_filter_v2(qs, field_list, request, model):
    filters = Q()
    search_data = request.GET.dict()
    sort_col = request.query_params.get('sort_col', None)
    sort_dir = request.query_params.get('sort_dir', None)
    global_search_value = request.query_params.get('global_filter', None)

    for row in field_list:
        field_name = row['field_name']
        field_type = row['field_type']
        front_end_field_name = row['front_end_field_name']
        search_value = search_data.get(front_end_field_name, None)

        if search_value:
            filters &= get_AND_filter_queries(field_type, field_name, search_value, model)
        
        if global_search_value:
            filters |= get_OR_filter_queries(field_type, field_name, global_search_value, model)

    if filters:
        qs = qs.filter(filters)

    if sort_col:
        sort_col = get_sort_column_field_name_by_front_end_field_name(field_list, sort_col)
        if sort_col:
            qs = get_sorted_qs(qs, sort_col, sort_dir)
    else:
        qs = qs.order_by('-id')

    return qs

def search_qs_from_global_filter(qs, search_text, search_dictionary, search_fields, sort_col, sort_dir, model):
    filters = Q()
    if search_text:
        for field in search_fields:
            if field == 'id' or field.endswith('_id'):
                try:
                    numeric_search = convert_search_text_to_numeric_search(search_text)
                    filters |= Q(**{field: numeric_search})
                except ValueError:
                    pass
            else:
                filters |= Q(**{f"{field}__icontains": search_text})
    filtered_qs = qs.filter(filters).distinct().order_by('-id')


    if search_dictionary:
        filtered_qs = search_qs_from_dic(filtered_qs, search_dictionary)
        
    if sort_col:
        filtered_qs = get_sorted_qs(filtered_qs, sort_col, sort_dir)
    else:
        filtered_qs = filtered_qs.order_by('-id')
    return filtered_qs

def search_qs_from_dic(qs, dic):
    filtered_qs = qs.filter(**dic).distinct().order_by('-id')
    return filtered_qs

def set_attrs(obj, **kwargs):
    for key, value in kwargs.items():
        obj.__setattr__(key, value)
    obj.save()


def google_api_distance():
    pass


def round_float_to_decimal_places(value, decimal_places):
    new_value = value
    if not is_none(value):
        new_value = round(value, decimal_places)

        # Adds 1 after new value if number after decimal value is greater than 5
        # if round_and_add:
        #     value_difference = value - new_value
        #     remainder = value_difference * (10 ^ decimal_places + 1)
        #
        #     if remainder >= 5:
        #         add_value = 1 / (10 ^ decimal_places)
        #         new_value += add_value
    return new_value


def add_nums_or_none(nums):
    cost = 0

    for num in nums:
        if is_none(num):
            cost = None
            break
        cost += num
    return cost

def remove_dupplicate_words_from_string(text: str):
    text_words = text.split()
    seen = set()
    unique_words = []
    for word in text_words:
        if word not in seen:
            unique_words.append(word)
            seen.add(word)
    text = ' '.join(unique_words)
    return text