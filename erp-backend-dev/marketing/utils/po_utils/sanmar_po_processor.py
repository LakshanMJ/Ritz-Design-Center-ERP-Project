import openpyxl
from marketing.utils.aws_utils import handle_file_read
from marketing.mixins.po_processor_mixins import POProcessorMixin


class SanmarPOProcessor(POProcessorMixin):
    _po_text = ['po #', 'PO #',]
    _style_text = ['Style#', 'Style #',]
    _colorway_text = ['Color', 'color']
    _size_text = ['Size', 'size']
    _quantity_text = ['Order Quantity', 'order quantity']
    _country_text = ['coo', 'country', 'COO', 'Country']
    _delivery_date_text = ['Requested Ship Date', 'requested ship date']

    def __init__(self, excel_file_path, customer_id, attachment_id):
        super().__init__()
        self.excel_file_path = excel_file_path
        self.customer_id = customer_id
        self.attachment_id = attachment_id

    def santize_value(self, value):
        return str(value).lower().strip()

    def validate_and_get_header_column_index(self, sheet):
        headers = [cell.value for cell in sheet[1]]
        header_indices = {header: idx for idx, header in enumerate(headers)}
        po_column_idx = None
        sytle_column_idx = None
        colorway_column_idx = None
        size_column_idx = None
        quantity_column_idx = None
        country_column_idx = None
        delivery_date_column_idx = None

        for po_number_header in self._po_text:
            if po_number_header in header_indices:
                po_column_idx = header_indices[po_number_header]
                break
        for style_number_header in self._style_text:
            if style_number_header in header_indices:
                sytle_column_idx = header_indices[style_number_header]
                break
        for size_header in self._size_text:
            if size_header in header_indices:
                size_column_idx = header_indices[size_header]
                break
        for colorway_header in self._colorway_text:
            if colorway_header in header_indices:
                colorway_column_idx = header_indices[colorway_header]
                break
        for quantity_header in self._quantity_text:
            if quantity_header in header_indices:
                quantity_column_idx = header_indices[quantity_header]
                break
        for country_header in self._country_text:
            if country_header in header_indices:
                country_column_idx = header_indices[country_header]
                break
        for delivery_date_header in self._delivery_date_text:
            if delivery_date_header in header_indices:
                delivery_date_column_idx = header_indices[delivery_date_header]
                break
        if po_column_idx is None or colorway_column_idx is None or size_column_idx is None or quantity_column_idx is None \
              or sytle_column_idx is None or delivery_date_column_idx is None:
            have_errors = True
        else:
            have_errors = False
        return have_errors, po_column_idx, sytle_column_idx, colorway_column_idx, size_column_idx, quantity_column_idx, country_column_idx, delivery_date_column_idx

    def is_total_row(self, style_col_val, size_col_val, colorway_col_val):
        is_total_row = False
        if str(size_col_val).strip() in ['Total', 'total'] or size_col_val is None:
            if not (style_col_val and colorway_col_val)  or not (style_col_val.strip() and colorway_col_val.strip()) :
                is_total_row = True
        return is_total_row

    def get_po_data(self, sheet, po_column_idx, sytle_column_idx, colorway_column_idx, size_column_idx, quantity_column_idx, country_column_idx, delivery_date_column_idx):
        grouped_data = {}
        current_style_number = None
        current_po_number = None
        current_costing_version = None
        for row in sheet.iter_rows(min_row=2, values_only=True):
            po_number = row[po_column_idx]
            if po_number:
                if po_number not in grouped_data:
                    grouped_data[po_number] = {'costing_version': None, 'delivery_date':None,  'data': []}
                    current_po_number = po_number
                else:
                    if po_number != current_po_number:
                        self.add_error(current_po_number, "PO Number %s duplicated. PO Numbers cannot be duplicated" % (current_po_number))
            style_number = row[sytle_column_idx]
            colorway = row[colorway_column_idx]
            size = row[size_column_idx]
            quantity = row[quantity_column_idx]
            delivery_date = row[delivery_date_column_idx]
            country = None
            if self.is_total_row(style_number, size, colorway):
                continue

            if not grouped_data[current_po_number]['costing_version']:
                costing_version = self.get_matching_object(self._COSTING_VERSION_OBJECT_TYPE, current_po_number, style_number=style_number, customer_id=self.customer_id)
                grouped_data[current_po_number]['costing_version'] = costing_version
                grouped_data[current_po_number]['delivery_date'] = delivery_date
                current_style_number = style_number
                current_costing_version = costing_version
                if not costing_version:
                    break
            elif current_style_number != style_number:
                self.add_error(current_po_number, "PO Number %s has multiple Style Numbers. A PO can only have one Style Number")

            processed_data = self.get_processed_po_row_data(current_po_number, current_costing_version, style_number, country, size, colorway, quantity)
            grouped_data[current_po_number]['data'].append(processed_data)
        return grouped_data

    def process_file(self):
        file = handle_file_read(self.excel_file_path)
        workbook = openpyxl.load_workbook(file)
        data = {}
        errors = None
        sheet = workbook.active
        have_errors, po_column_idx, style_column_idx, colorway_column_idx, size_column_idx, quantity_column_idx, \
            country_column_index, delivery_date_column_idx = self.validate_and_get_header_column_index(sheet)

        if not have_errors:
            data = self.get_po_data(sheet, po_column_idx, style_column_idx, colorway_column_idx, size_column_idx, quantity_column_idx, country_column_index, delivery_date_column_idx)
        else:
            self.add_error(self.GENERAL_ERRORS_KEY, "Purchase order format is not valid. Unable to locate headers. Please make sure the 1st row contains the headers.")
        workbook.close()

        return errors, data

    def process_and_create_purchase_orders(self):
        errors_in_process, data = self.process_file()
        errors = []
        if errors_in_process:
            errors.append(errors_in_process)

        po_ids = self.create_purchase_orders(data, self.customer_id, self.attachment_id)
        response = {
            'created': not self.have_errors,
        }
        if not self.have_errors:
            response['po_list'] = po_ids
        else:
            response['errors'] = self.errors
        return response

