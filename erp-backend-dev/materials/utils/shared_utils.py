from materials.fieldmetadata.material_metadata import ATTRIBUTE_VALUE_KEY


def filter_header_columns(headers, filter_list, filter_field=ATTRIBUTE_VALUE_KEY):
    '''
    :param headers: list of headers
    :param filter_list: what headers need to included
    :return: returns a list of headers with the data in filter_list only
    '''

    new_headers = []
    for header in headers:
        if header.get(filter_field, None) in filter_list:
            new_headers.append(header)
    return new_headers

