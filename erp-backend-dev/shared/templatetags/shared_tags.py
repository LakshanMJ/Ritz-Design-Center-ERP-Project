from django import template

from materials.fieldmetadata.material_metadata import ATTRIBUTE_DISPLAY_VALUE_KEY

register = template.Library()


@register.filter
def get_display_value_from_header(data, headers):
    display_key = headers.get(ATTRIBUTE_DISPLAY_VALUE_KEY, None)
    return data.get(display_key, '--')
