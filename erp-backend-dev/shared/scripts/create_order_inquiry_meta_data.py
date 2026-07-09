from shared.models import Country, ColorwayCategory, Size, SizeCategory, Brand, Season, User, Role, Customer, CustomerBrand, OtherCost, CustomerBrandDepartment
from materials.models import EmbellishmentType, EmbellishmentSubType, UserDefinedMaterial, UserDefinedMaterialDefect, FABRIC_TRIM_TYPES
from shared.permissions.roles import ALL_ROLES
from shared.constants.customer_processors import *


class OrderInquiryMetaData:
    def create_order_inquiry_meta_data(self):
        # self.create_admin_user()
        # self.create_roles()
        # self.assign_user_roles()
        # self.create_colorway_category()
        # self.create_size_category_sizes()
        # self.create_embellishment_type()
        # self.create_customer()
        # self.create_other_cost_type()
        self.create_fabric_defects()

    def create_admin_user(self):
        admin_user_name = 'ritzerpadmin'
        admin_user, created = User.objects.get_or_create(
            username=admin_user_name,
            first_name='ritzerp',
            last_name='admin',
            email='erp@ritzclothing.lk',
        )
        admin_user.set_password('1234@qwer') #TODO alway set new password after create new database
        admin_user.save()

    def create_roles(self):
        role_list = ALL_ROLES

        for role in role_list:
            role, created = Role.objects.get_or_create(name=role)

    def assign_user_roles(self):
        admin_user = User.objects.get(username='ritzerpadmin')
        roles = Role.objects.all()
        for role in roles:
            role.users.add(admin_user)

    def create_colorway_category(self):
        colorway_category_list = ['Solid', 'AOP - One Garment One Way', 'AOP - All Garment One Way', 'Melange', 'Yarn Dyed']
        for colorway_category in colorway_category_list:
            obj, created = ColorwayCategory.objects.get_or_create(name=colorway_category)
        return colorway_category_list

    def create_size_category_sizes(self):
        STANDARD_SIZE_CATEGORY = 'Standard'
        INCHES_SIZE_CATEGORY = 'Inches'
        YEAR_BASED_SIZE_CATEGORY = 'Year Based'
        SINGLE_YEAR_BASED_SIZE_CATEGORY = 'Single Year Based'

        size_category_list = [STANDARD_SIZE_CATEGORY, INCHES_SIZE_CATEGORY, YEAR_BASED_SIZE_CATEGORY, SINGLE_YEAR_BASED_SIZE_CATEGORY]

        standard_size_list = [
            ['Extra Small', 'XS',],
            ['Small', 'S'],
            ['Medium', 'M'],
            ['Large', 'L'],
            ['Extra Large', 'XL'],
            ['Two Extra Large', '2XL'],
            ['Three Extra Large', '3XL'],
            ['Four Extra Large', '4XL'],
            ['Five Extra Large', '5XL'],
            ['Six Extra Large', '6XL'],
            ['Tall Large', 'Tall L'],
            ['Tall Extra Large', 'Tall XL'],
            ['Tall Two Extra Large', 'Tall XXL'],
            ['Tall Three Extra Large', 'Tall XXXL'],
            ['Tall Four Extra Large', 'Tall XXXXL'],
            ['Tall Five Extra Large', 'Tall XXXXXL'],
            ['Tall Six Extra Large', 'Tall XXXXXXL'],
        ]
        inches_size_list = ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48']

        year_based_size_list = [
            ['Tiny Baby', 'NB'],
            ['New Baby', 'TB'],
            ['0-3 Months', '0-3 Mo'],
            ['3-6 Months', '3-6 Mo'],
            ['6-9 Months', '6-9 Mo'],
            ['9-12 Months', '9-12 Mo'],
            ['12-18 Months', '12-18 Mo'],
            ['18-24 Months', '18-24 Mo'],
            ['2-3 Years', '2-3 Y'],
            ['3-4 Years', '3-4 Y'],
            ['4-5 Years' , '4-5 Y'],
            ['5-6 Years', '5-6 Y'],
            ['6-7 Years', '6-7 Y'],
            ['7-8 Years', '7-8 Y'],
            ['8-9 Years', '8-9 Y'],
            ['9-10 Years', '9-10 Y'],
            ['10-11 Years', '10-11 Y'],
            ['11-12 Years','11-12 Y'],
            ['12-13 Years', '12-13 Y'],
            ['13-14 Years', '13-14 Y'],
            ['14-15 Years', '14-15 Y'],
            ['15-16 Years', '15-16 Y'],
            ['16-17 Years', '16-17 Y'],
            ['17-18 Years', '17-18 Y'],
        ]

        single_year_based_size_list = ['1 Yrs', '2 Yrs', '3 Yrs', '4 Yrs', '5 Yrs', '6 Yrs', '7 Yrs', '8 Yrs', '9 Yrs', '10 Yrs', '11 Yrs', '12 Yrs', '13 Yrs', '14 Yrs', '15 Yrs', '16 Yrs',]
        
        for size_category in size_category_list:
            size_category, created = SizeCategory.objects.get_or_create(name=size_category)

        size_categories = SizeCategory.objects.all()

        for size_category in size_categories:
            if size_category.name == STANDARD_SIZE_CATEGORY:
                count = 1
                for standard_size in standard_size_list:
                    sorting_order = count * 1
                    obj, created = Size.objects.get_or_create(category=size_category, name=standard_size[0],
                                                              abbreviation=standard_size[1], sorting_order=sorting_order)
                    count = count+1

            if size_category.name == INCHES_SIZE_CATEGORY:
                count = 1
                for inches_size in inches_size_list:
                    sorting_order = count * 1
                    obj, created = Size.objects.get_or_create(category=size_category, name=inches_size,
                                                              abbreviation=inches_size, sorting_order=sorting_order)
                    count = count+1

            if size_category.name == YEAR_BASED_SIZE_CATEGORY:
                count = 1
                for year_basaed_size in year_based_size_list:
                    sorting_order = count * 100
                    obj, created = Size.objects.get_or_create(category=size_category, name=year_basaed_size[0], abbreviation=year_basaed_size[1], sorting_order=sorting_order)
                    count = count+1

            if size_category.name == SINGLE_YEAR_BASED_SIZE_CATEGORY:
                count = 1
                for single_year_basaed_size in single_year_based_size_list:
                    sorting_order = count * 100
                    obj, created = Size.objects.get_or_create(category=size_category, name=single_year_basaed_size, abbreviation=single_year_basaed_size, sorting_order=sorting_order)
                    count = count+1
                    
        return size_category_list

    def create_embellishment_type(self):
        PRINTING_TYPE = 'Printing'
        EMBROIDERY_TYPE = 'Embroidery'
        APPLIQUE_TYPE = 'Applique'
        RHINESTONES_TYPE = 'Rhinestones'

        type_list = [PRINTING_TYPE, EMBROIDERY_TYPE, APPLIQUE_TYPE, RHINESTONES_TYPE]

        printing_sub_type_list = ['Pad Print', 'Pigment print', 'Discharge print', 'Rubber Print', 'Sublimation Print', 'Digital Print', 'Flock print', 'Foil print', 
                                  'CMYK', 'Glitter/ Shimmer print', 'Gloss print', 'Metallic print', 'Gradient Print', 'Glow in the dark', 'Caviar Beads', 'High Density', 
                                  'Gel Print', 'Litho Print', 'Crack print', 'Reverse Print', 'Puff/ Emboss Print', 'Thermo Graphic', 'Shaded Print', 'Toner Print', 
                                  'High Build', 'Illusion print', 'Holographic']
        embroidery_sub_type_list = ['Sating Embroidery', 'Chain Embroidery', 'Cross Stitch', 'Herringbone Stitch', 'Fly Stitch', 'Beaded Embroidery', 'Laser Embroidery', 
                                    'Run Stitch Embroidery', 'Tatami Embroidery', 'Zigzag Embroidery', 'Pearl Embroidery', 'Cut Embroidery', 'Eyelet Embroidery', 'Tassel Embroidery', 
                                    'Taping Embroidery', 'Coding Embroidery']
        applique_sub_type_list = ['Laser Cut', 'Mold/Dye Cut', 'Hand Cut', 'Raw-Edge Applique', 'Reverse Applique', 'Patchwork Applique', 'Crochet Applique', 'Motif Applique', 
                                  '3D Applique', 'Net/Organza Applique', 'Lace Applique', 'Felt Applique', 'Burn Out']
        rhinestones_sub_type_list = ['Sequence Sidehole/Centerhole', 'Bugle Beads', 'Super Cut/Ultra Sonic Cut', 'Gem/Diamond', 'Pearls']

        for type in type_list:
            type, created = EmbellishmentType.objects.get_or_create(name=type)

        types = EmbellishmentType.objects.all()

        for type in types:
            if type.name == PRINTING_TYPE:
                for printing_sub_type in printing_sub_type_list:
                    sub_type, created = EmbellishmentSubType.objects.get_or_create(embellishment_type=type, name=printing_sub_type)
            if type.name == EMBROIDERY_TYPE:
                for embroidery_sub_type in embroidery_sub_type_list:
                    sub_type, created = EmbellishmentSubType.objects.get_or_create(embellishment_type=type, name=embroidery_sub_type)
            if type.name == APPLIQUE_TYPE:
                for applique_sub_type in applique_sub_type_list:
                    sub_type, created = EmbellishmentSubType.objects.get_or_create(embellishment_type=type, name=applique_sub_type)
            if type.name == RHINESTONES_TYPE:
                for rhinestones_sub_type in rhinestones_sub_type_list:
                    sub_type, created = EmbellishmentSubType.objects.get_or_create(embellishment_type=type, name=rhinestones_sub_type)
        return type_list
    
    def create_customer(self):
        customers_data = [
            {
                'name': 'Sanmar',
                'phone_number':'0000000000',
                'email':'sanmar@gmail.com',
                'po_processor_name': SANMAR_PO_PROCESSOR,
                'code': 'SANMA',
                'brands':   [
                    {
                        'name': 'Port Authority',
                        'code': 'PTAUY',
                        'seasons': ['Jan Buy', 'Feb Buy', 'March Buy', 'April Buy', 'May Buy', 'Jun Buy', 'Jul Buy', 'August Buy', 'Sept Buy', 'Oct Buy', 'Nov Buy', 'Dec Buy',],
                        'countries': ['US',],
                        'departments': ['Port Authority']
                    },
                    {
                        'name': 'Sport Tek',
                        'code': 'SPTTK',
                        'seasons': ['Jan Buy', 'Feb Buy', 'March Buy', 'April Buy', 'May Buy', 'Jun Buy', 'Jul Buy', 'August Buy', 'Sept Buy', 'Oct Buy', 'Nov Buy', 'Dec Buy',],
                        'countries': ['US', ],
                        'departments': ['Sport Tek']
                    }
                ]
            },
            {
                'name': 'Next',
                'phone_number':'0000000000',
                'email':'next@gmail.com',
                'po_processor_name': NEXT_PO_PROCESSOR,
                'code': 'NEXT',
                'brands':   [
                    {
                        'name': 'Next',
                        'code': 'NEXT',
                        'seasons': ['SS26', 'AW25', 'SS25'],
                        'countries': ['UK'],
                        'departments': ['Mens']
                    }
                ]
            },
            {
                'name': 'M&S',
                'phone_number':'0000000000',
                'email':'mands@gmail.com',
                'po_processor_name': MANDS_PO_PROCESSOR,
                'code': 'M&S',
                'brands':   [
                    {
                        'name': 'M&S',
                        'code': 'M&S',
                        'seasons': ['Winter', 'Autumn', 'Summer', 'Spring'],
                        'countries': ['UK'],
                        'departments': ['T86 Childrens Nightwear', 'T88 Toddler Boys', 'T87 Boyswear', 'T71 Childrens Underwear', 'T76 Schoolwear', 'T78 Babywear', 'T74 Girlswear', 'T92 Baby Wear', 'T77 Toddler Girls']
                    }
                ]
            },
            {
                'name': 'LIDL',
                'phone_number':'0000000000',
                'email':'lidl@gmail.com',
                'po_processor_name': LIDL_PO_PROCESSOR,
                'code': 'LIDL',
                'brands':   [
                    {
                        'name': 'LIDL',
                        'code': 'LIDL',
                        'seasons': ['January Selection', 'April Selection', 'July Selection', 'Octomber Selection'],
                        'countries': ['CB1', 'CB2', 'CB3', 'CB4', 'CB5', 'CB6', 'CB7', 'CB8', 'CB9', 'CB10'],
                        'departments': ['LIDL']
                    }
                ]
            },
            {
                'name': 'Pepco',
                'phone_number':'0000000000',
                'email':'pepco@gmail.com',
                'po_processor_name': GENERAL_PO_PROCESSOR,
                'code': 'PEPCO',
                'brands':   [
                    {
                        'name': 'Pepco',
                        'code': 'PEPCO',
                        'seasons': ['Winter', 'Autumn', 'Summer', 'Spring'],
                        'countries': ['UK'],
                        'departments': ['Pepco']
                    }
                ]
            },
            {
                'name': 'Matalan',
                'phone_number':'0000000000',
                'email':'matalan@gmail.com',
                'po_processor_name': GENERAL_PO_PROCESSOR,
                'code': 'MATLN',
                'brands':   [
                    {
                        'name': 'Matalan',
                        'code': 'MATAL',
                        'seasons': ['Autumn Winter - AW', 'Spring Summer - SS'],
                        'countries': ['UK'],
                        'departments': ['Baby wear - Essentials', 'Infant Girlswear', 'Older Girlswear', 'Ladies - Nightwear', 'Disney license', 'Baby Fashion', 'Infant Boys', 'Order Boys', 'Girlswear', 'Menswear', 'Children’s Nightwear']
                    }
                ]
            },
            # {
            #     'name': 'Dewhirst',
            #     'phone_number':'0000000000',
            #     'email':'dewhirst@gmail.com',
            #     'po_processor_name': GENERAL_PO_PROCESSOR,
            #     'code': 'DEWHT',
            #     'brands':   [
            #         {
            #             'name': 'F&F',
            #             'code': 'F&F',
            #             'seasons': [],
            #             'countries': [],
            #             'departments': []
            #         }
            #     ]
            # },
            {
                'name': 'BESTSELLER',
                'phone_number':'0000000000',
                'email':'bestseller@gmail.com',
                'po_processor_name': GENERAL_PO_PROCESSOR,
                'code': 'BESTS',
                'brands':   [
                    {
                        'name': 'PIECES',
                        'code': 'PIECS',
                        'seasons': ['Autum Winter'],
                        'countries': ['Denmark'],
                        'departments': ['Bestseller']
                    },
                    {
                        'name': 'VILA',
                        'code': 'VILA',
                        'seasons': ['Autum Winter'],
                        'countries': ['Denmark'],
                        'departments': ['Bestseller']
                    }
                ]
            },
            # {
            #     'name': 'Tesco',
            #     'phone_number':'0000000000',
            #     'email':'tesco@gmail.com',
            #     'po_processor_name': GENERAL_PO_PROCESSOR,
            #     'code': 'TESCO',
            #     'brands':   [
            #         {
            #             'name': 'F & F',
            #             'code': 'TESCO',
            #             'seasons': ['Spring Summer - SS', 'Autumn Winter - AW'],
            #             'countries': ['CE', 'UK'],
            #             'departments': ['F & F']
            #         }
            #     ]
            # }
        ]
        for row in customers_data:
            customer, created = Customer.objects.get_or_create(name=row['name'])
            customer.phone_number = row['phone_number']
            customer.email = row['email']
            customer.po_processor_name = row['po_processor_name']
            customer.code = row['code']
            customer.save()

            for brand_data in row['brands']:
                brand, created = Brand.objects.get_or_create(name=brand_data['name'], code=brand_data['code'])
                customer_brand, created = CustomerBrand.objects.get_or_create(customer=customer, brand=brand)
                for country_row in brand_data['countries']:
                    country, created = Country.objects.get_or_create(name=country_row, customer_brand=customer_brand)
                for season_row in brand_data['seasons']:
                    season, created = Season.objects.get_or_create(name=season_row, customer_brand=customer_brand)
                for department_row in brand_data['departments']:
                    department, created = CustomerBrandDepartment.objects.get_or_create(department=department_row, customer_brand=customer_brand)  

        return customers_data
    
    def create_other_cost_type(self):
        DEVELOPMENT_TYPE = 'Development'
        MOQ_AND_MCQ_TYPE = 'MOQ / MCQ'
        COURIER_COST_TYPE= 'Courier Cost'
        CLEARING_AND_FORWARDING_TYPE = 'Clearing & Forwarding'
        TESTING_TYPE = 'Testing'

        other_cost_list = [DEVELOPMENT_TYPE, MOQ_AND_MCQ_TYPE, COURIER_COST_TYPE, CLEARING_AND_FORWARDING_TYPE, TESTING_TYPE]

        for other_cost in other_cost_list:
            other_cost = OtherCost.objects.get_or_create(name=other_cost)

        return other_cost_list
    
    def create_fabric_defects(self):
        fabric_material = UserDefinedMaterial.objects.get(name=FABRIC_TRIM_TYPES)
        fabric_defect_list = [
            'Color/ Dyeing (Crease Patch)',
            'Color/ Dyeing (Dye Patch)',
            'Holes',
            'Missing Yarn',
            'Oil Marks',
            'Stain Mark',
            'Yarn damage (Foreign Yarn)',
            'Yarn damage (Slubs)',
        ]
        for fabric_defect in fabric_defect_list:
            user_defined_material_defect, created = UserDefinedMaterialDefect.objects.get_or_create(
                defect=fabric_defect,
                material=fabric_material
            )