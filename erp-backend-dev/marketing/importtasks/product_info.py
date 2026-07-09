import openpyxl
from marketing.models import ItemAttribute,Item, UserDefinedMaterial, Customer, CustomerBrand

def read_product_info_excel():
    excel_file_path = "/home/ubuntu/ProductInfoLIDL.xlsx"
    workbook = openpyxl.load_workbook(excel_file_path)
    sheet = workbook.active
    print(sheet)

    column_to_check = sheet['D']
    max_row_with_data = None
    for cell in column_to_check:
        if cell.value is not None:
            max_row_with_data = (cell.row)

    data = []
    current_product = ''
    current_rm_type = None 
    current_buyer = None

    previous_product_1 = None
    previous_product_2 = None

    for row in sheet.iter_rows(min_row=2,max_row=max_row_with_data, max_col=5, values_only=True):
        product_1, product_2 , rm_type, placement, buyer = row

        if product_1 is not None: 
            previous_product_1 = product_1
        else:
            product_1=previous_product_1
        
        if product_2 is not None: 
            previous_product_2 = product_2
        else:
            product_2=previous_product_2

        product_description = f'{previous_product_1} - {previous_product_2}'

        if rm_type is not None:
            current_rm_type = rm_type
        else:    
            rm_type = current_rm_type

        if buyer is not None:
            current_buyer = buyer
        else:    
            buyer = current_buyer

        if product_description is not None:
            current_product = product_description
            data.append({
                    current_product: {'RM TYPE': current_rm_type, 'Placement': placement, 'Buyer': buyer }
                })
        else:
            product_description = current_product

    for item_data in data:
        for key, values in item_data.items():
            name = key
            buyer = values['Buyer']
            customer = Customer.objects.filter(name=buyer)[0]
            customer_brand = CustomerBrand.objects.filter(customer=customer)[0]
            item , created = Item.objects.get_or_create(name=name, customer_brand=customer_brand) 
            item.create_item_variations()
        name_mapping = {
                'body fabric':'fabric',
                'binding': 'fabric',
                'gusset': 'fabric',
                'neck binding': 'fabric',
                'neck tape': 'fabric',
                'collors': 'fabric',
                'cuffs': 'fabric',
                'fusing': 'fabric',
                'neck rib': 'fabric',
                'back buggy': 'fabric',
                'trim fabric': 'fabric',
                'back neck tape': 'fabric',
                'binding fabric': 'fabric',
                'wadding fabric': 'fabric',
                'rib': 'fabric',
                'hoodlining': 'fabric',
                'pocket bag': 'fabric',
                'back york': 'fabric',
                'piping': 'fabric',
                'printed cello tape': 'cellotape',
                'clear cello tape': 'cellotape',
                'cello tape': 'cellotape',
                'master poly bag': 'polybag',
                'ecom poly bag': 'polybag',
                'hanger poly bag': 'polybag',
                'carton sticker': 'sticker',
                'inner sticker - pepco': 'sticker',
                'outer sticker - pepco': 'sticker',
                'inner sticker - pep&co': 'sticker',
                'outer sticker - pep&co': 'sticker',
                'rfid': 'rfidstickertag',
                'rfid swing tag': 'rfidstickertag',
                'box end label': 'packinglabels',
                'box': 'carton',
                '5 ply printed carton': 'carton',
                '3 ply carton divider': 'cartondivider',
                'swing tag pep&co': 'swingtag',
                'labels': 'sewinglabels',
                'international label': 'sewinglabels',
                'mitred enfold label': 'sewinglabels',
                'main label': 'main_label',
                'care label': 'care_label',
                'size label': 'size_label',
                'vendor label': 'vendor_label',
                'woven label': 'woven_label',
                'waistband': 'elastic',
                'flat knit': 'flat_knit',
                'barcode sticker': 'barcodesticker',
                'carton sticker': 'carton_sticker',
                'waterfall': 'waterfall',
                'insert cardboard': 'insert_cardboard'
            }
        
        for attributes in item_data.values():
            placement_name = attributes['Placement']
            rm_type = attributes['RM TYPE']
            placement_name = placement_name.lower().strip()
            
            if placement_name in name_mapping:
                placement_name = name_mapping[placement_name]
            else:
                placement_name = placement_name.lower().replace(' ', '').strip()
            try:
                userdefinedmaterials= UserDefinedMaterial.objects.filter(name=placement_name)
                if userdefinedmaterials.exists():
                    material = userdefinedmaterials[0]
                    if rm_type == 'Sewing Trims' or rm_type == 'Fabric':
                        ItemAttribute.objects.get_or_create(item=item, type=material.name, placement=attributes['Placement'], 
                                                        estimated_consumption_ratio_units = material.estimated_consumption_ratio_units,
                                                        assign_type = ItemAttribute.ORDER_PACK_ITEM, material = material)
                    else:
                        ItemAttribute.objects.get_or_create(item=item, type=material.name, placement=attributes['Placement'], 
                                                        estimated_consumption_ratio_units = material.estimated_consumption_ratio_units,
                                                        assign_type = ItemAttribute.ORDER_PACK, material = material)
                                                                          
            except UserDefinedMaterial.DoesNotExist:
                # print('no material')
                continue