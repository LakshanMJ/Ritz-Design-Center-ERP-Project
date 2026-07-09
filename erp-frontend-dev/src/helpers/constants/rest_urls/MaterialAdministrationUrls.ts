export const changeDropdownOptionStateURL = (optionId : number) => `materials/userdefinematerial/dropdown/delete/${optionId}/`;

export const createdMaterialVariationDetailListURL = ( variation_id: number, page_number: number, searchedField: string | null, searchedText: string ) =>  `materials/generic_material/customer_supplier_brand_material_code/list/${variation_id}/`;

export const createMaterialURL = () => "materials/userdefinematerial/";

export const updateMaterialURL = (materialID: number) => `materials/userdefinematerial/update/${materialID}/`;

export const getMaterialDetailURL = (materialID: number) => `materials/userdefinematerial/${materialID}/`;

export const getDefaultMeasuringUnitsURL = () => `materials/userdefinematerial/measurement_unit/list/`;

export const createMaterialAttributeURL = () => `materials/userdefinematerial/attribute/`;

export const updateMaterialAttributeURL = (attributeID: number) => `materials/userdefinematerial/attribute/update/${attributeID}/`;

export const getUserDefineMaterialsURL = () => `materials/userdefinematerial/list/`;

export const materialOptionListURL = () => `materials/userdefinematerial/attribute/dropdown/list/`;

export const createdMaterialDetailListURL = ( materialId: number, pageNumber: number, pageSize: number, optionalParams?: string ) => {
    let url = `materials/generic_material/list/${materialId}/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const customerMaterialDetailListURL = ( pageNumber: number, pageSize: number, optionalParams?: string ) => {
    let url = `materials/materail_library/?page=${pageNumber}&page_size=${pageSize}`;
    if (optionalParams) {
        url += `&${optionalParams}`;
    }
    return url;
};

export const customerBrandMaterialSupplierListURL = (materialId: number) => `materials/customer_brand_material/supplier/list/${materialId}/`;

export const customerBrandMaterialCostingListURL = (materialId: number) => `materials/customer_brand_material/costing/list/${materialId}/`;

export const createMaterialDefectURL = () => `materials/userdefinematerial/defect/`;

export const updateeMaterialDefectURL = (defectlID: number) => `materials/userdefinematerial/defect/update/${defectlID}`;

export const getMaterialDefectURL = (defectlID: number) => `materials/userdefinematerial/defect/update/${(defectlID)}`;

export const getItemMaterialListURL = (variationId: number) => `materials/userdefinematerial/items/list/${variationId}`;

export const getCostingMaterialListURL = (variationId: number) => `materials/userdefinematerial/costing/list/${variationId}`;

export const getSupplierMaterialListURL = (customer_brand_material_id: number) => `materials/supplier_material/details/${customer_brand_material_id}`;

export const dropDownMaterialListURL = () => `materials/materail_library/`;
