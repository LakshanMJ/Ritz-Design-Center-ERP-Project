
def choice_to_dictionary(choice):
    return {element[0]: element[1] for element in choice}


def choice_to_reverse_dictionary(choice):
    return {element[1]: element[0] for element in choice}