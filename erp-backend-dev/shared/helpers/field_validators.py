

def valid_float_field(value):
    valid = True
    try:
        return_value = float(value)
    except (ValueError, TypeError):
        valid = False
    return valid

def valid_integer_field(value):
    valid = True
    try:
        return_value = int(value)
    except (ValueError, TypeError):
        valid = False
    return valid