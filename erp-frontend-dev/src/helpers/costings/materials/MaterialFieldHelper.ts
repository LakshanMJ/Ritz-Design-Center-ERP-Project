// These values should match the 'type' values in the Material model
import {
    PENDING_MATERIALS_VERSION_STATE,
    PENDING_SUPPLIER_SELECTION_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import * as restUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import {materialsWithSameReferenceCode} from "@/helpers/constants/RestUrls";
import ShowMaterialReferenceCode from "@/views/costing/OrderInquiry/Material/ShowReferenceCode";
import {savePackPlacementMaterialURL} from "@/helpers/constants/rest_urls/CostingUrls";

export const FABRIC_MATERIAL = 'fabric';
export const FABRIC_MATERIAL_LABEL = 'Fabric';

// Reducer states that are used to load data for meta data for material input

export abstract class MaterialPlacementHelper {

    materialDisplayValue: string; // Display Value: ex: fabric= Fabric

    supplierInquiryHeaders: any = [];

    fields: any = []; // Fields that we will display in the table

    saveURL: string = '';
    materialType: string;
    headerLabelField: string = 'label';
    valueDisplayField: string = 'name';
    attributeTypeKey: string = 'attribute_type';
    valueField: string = 'value';
    readOnlyKey: string = 'isReadOnly';
    dropdownOptionsURLKey = 'dropDownOptionsURL';
    dropDownOptionsKey = 'dropDownOptions';
    public isSelectFieldKey = 'isSelectField'

    commonFields: any = [
        { [this.headerLabelField]: "Placement", [this.valueDisplayField]: 'placement', [this.attributeTypeKey]: 'text',[this.valueField]: 'placement',
            [this.readOnlyKey]: true},
        { [this.headerLabelField]: "Reference Code", [this.valueDisplayField]: 'reference_code', [this.attributeTypeKey]: 'text',[this.valueField]: 'reference_code'},
    ];

    constructor(materialType: string) {
        this.materialType = materialType;
    }

    getMaterialType(): string {
        return this.materialType;
    }

    getHeaderLabelField() {
        return this.headerLabelField;
    }

    getFields() {
        return this.fields;
    }

    getMaterialDisplayValue() {
        return this.materialDisplayValue;
    }

    getSupplierInquiryHeaders() {
        return this.supplierInquiryHeaders;
    }

    // Returns display value for row
    getMaterialAttributeDisplayValue(headerRow: any, dataRow: any) {
        if (headerRow?.[this.headerLabelField] === '' || headerRow?.[this.isSelectFieldKey]) {
            return dataRow?.[headerRow?.[this?.valueDisplayField]] || '';
        } else {
            // console.log(dataRow?.[headerRow?.[this?.valueDisplayField]], 'adssdaasdasd', headerRow?.[this?.valueDisplayField], dataRow)
            return dataRow?.[headerRow?.[this?.valueDisplayField]] || '--';
        }
    }

    setMaterialAttributeDropDownOptions(displayFieldName: string, options: any) {
        if (options)
        for (let i=0; i < this.fields.length; i++) {
            if (this.fields[i]?.[this.valueDisplayField] == displayFieldName) {
                this.fields[i] = {...this.fields[i], dropDownOptions: [...options]}
            }
        }

    }
}

export abstract class GenericPlacementHelper extends MaterialPlacementHelper {
    abstract getSelectMaterialURL() : string;

    constructor(props: any) {
        // materialType: string, headers: any, display_name: string, supplier_inquiry_headers: any, inputType = PENDING_MATERIALS_VERSION_STATE, readonly: true

        super(props.materialType);

        const inputType = props?.inputType || PENDING_MATERIALS_VERSION_STATE;

        if (inputType == PENDING_MATERIALS_VERSION_STATE) {
            let editColumns: any = [];
            let editPlacementColumns: any = [];
            if (!props.readOnly) {
                editColumns = [
                    {[this.headerLabelField]: 'Assign Material', [this.valueDisplayField]: 'edit', isAction: true},
                ]
                editPlacementColumns = [
                    {[this.headerLabelField]: '', [this.valueDisplayField]: 'edit_placement', isAction: true},
                ]
            }
            this.fields = [
                ...editPlacementColumns,
                ...props.headers,
            ];
        } else if (inputType == PENDING_SUPPLIER_SELECTION_VERSION_STATE) {
            this.fields = [
                ...props.headers,
                {[this.headerLabelField]: 'Select', [this.valueDisplayField]: 'select', isAction: false, [this.isSelectFieldKey]: true},
            ];
        }
        this.materialDisplayValue = props.materialType;
        this.materialDisplayValue = props.displayName;
        this.supplierInquiryHeaders = props?.supplierInquiryHeaders || [];
    }

    getDropDownOptions() {
        const dropDownOptions = []
        for (let i=0; i < this.fields.length; i++) {
            let field = this.fields[i];
            if (field[this.attributeTypeKey] == 'dropdown') {
                const field_name = field?.[this.valueField];
                const field_display_name = field?.[this.valueDisplayField];
                if (field?.[field_name]) {
                    const optionsLoadURL = field?.[field_name]?.[this.dropdownOptionsURLKey];
                    if (optionsLoadURL) {
                        dropDownOptions.push({
                            fieldName: field_name,
                            fieldDisplayName: field_display_name,
                            url: optionsLoadURL
                        });
                    }
                } else {
                        dropDownOptions.push({
                            fieldName: field_name,
                            fieldDisplayName: field_display_name,
                            dropDownOptions: field?.[this.dropDownOptionsKey] || []
                        });
                    }
            }
        }
        return dropDownOptions;
    }

}

export class OrderPlacementHelper extends GenericPlacementHelper {
    orderId: number;
    versionId: number;
    objectId: number; // This is Pack Item ID or the Pack ID
    orderPlacementId: number;
    colorwayId: number;

    orderItemId: number;
    itemId: number;

    constructor(props: any) {

        super(props);

        this.orderId = props.orderId;
        this.versionId = props.versionId;
        this.itemId = props?.itemId;
        // this.objectId = props.objectId;

    }

    getSelectMaterialURL() {
        return restUrls.getMaterialDetailsURL(this.orderId, this.materialType);
    }

    setOrderPlacementId(placementId: number) {
        this.orderPlacementId = placementId;
    }

    setColorwayId(colorwayId: number) {
        this.colorwayId = colorwayId;
    }

    getOrderPlacementId() {
        return this.orderPlacementId;
    }

    getColorwayId() {
        return this.colorwayId;
    }

    setOrderItemId(orderItemId: number) {
        this.orderItemId = orderItemId;
    }

    setItemId(itemId: number) {
        this.itemId = itemId;
    }

    getOrderItemId() {
        return this.orderItemId;
    }
    
    getItemId() {
        return this.itemId;
    }

}

export class OrderPackItemPlacementHelper extends OrderPlacementHelper {

    getAssignMaterialSaveUrl() {
        return costingRestUrls.savePackItemPlacementMaterialURL(this.versionId);
    }

    getObjectListUrl() {
        return costingRestUrls.packItemPlacements(this.versionId, this.orderPlacementId);
    }


}

export class OrderPackPlacementHelper extends OrderPlacementHelper {

    getAssignMaterialSaveUrl() {
        return costingRestUrls.savePackPlacementMaterialURL(this.versionId);
    }

    getObjectListUrl() {
        return costingRestUrls.packPlacements(this.versionId, this.orderPlacementId);
    }
}

export class POPlacementHelper extends GenericPlacementHelper {
    purchaseOrderId: number;
    referenceCodeId: number;

    constructor(props: any) {
        super(props);
        this.purchaseOrderId = props.purchaseOrderId;
    }

    setReferenceCodeId(referenceCodeId: number) {
        this.referenceCodeId = referenceCodeId;
    }

    getSelectMaterialURL() {
        return restUrls.materialsWithSameReferenceCode(this.purchaseOrderId, this.referenceCodeId, this.materialType);
    }

}
