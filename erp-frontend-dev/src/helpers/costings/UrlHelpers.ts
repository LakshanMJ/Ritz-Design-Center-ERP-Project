import {
    FABRIC_MATERIAL_TYPE,
    ITEM_CW_COUNTRY_FABRICS_LEVEL,
    ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL,
    ITEM_CW_LEVEL
} from "@/helpers/costings/constants";

export class MaterialURLHelper {
    private level: string;
    private fabric_parent_id: number;
    private material_type: string;

    // TODO - add urls
    private FABRIC_DETAIL_URLS = {
        [FABRIC_MATERIAL_TYPE]: {
            [ITEM_CW_LEVEL]: 'marketing/orderitemcolorwayfabric/list/',
            [ITEM_CW_COUNTRY_FABRICS_LEVEL]: 'url',
            [ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL]: 'url',
        }
    }

    private FABRIC_CREATE_URLS = {
        [FABRIC_MATERIAL_TYPE]: {
            [ITEM_CW_LEVEL]: 'marketing/orderitemcolorwayfabric/create/',
            [ITEM_CW_COUNTRY_FABRICS_LEVEL]: 'url',
            [ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL]: 'url',
        }
    }

    private FABRIC_UPDATE_URLS = {
        [FABRIC_MATERIAL_TYPE]: {
            [ITEM_CW_LEVEL]: 'marketing/orderitemcolorwayfabric/',
            [ITEM_CW_COUNTRY_FABRICS_LEVEL]: 'url',
            [ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL]: 'url',
        }
    }

    private FABRIC_DELETE_URLS = {
        [FABRIC_MATERIAL_TYPE]: {
            [ITEM_CW_LEVEL]: 'url',
            [ITEM_CW_COUNTRY_FABRICS_LEVEL]: 'url',
            [ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL]: 'url',
        }
    }

    constructor(level: any, fabric_parent_id: any, material_type: string) {
        this.level = level;
        this.fabric_parent_id = fabric_parent_id;
        this.material_type = material_type;
    }

    getParentId() {
        return this.fabric_parent_id;
    }

    getLevel() {
        return this.level;
    }
    getFetchUrl() {
        switch (this.level) {
            case ITEM_CW_LEVEL:
                return this.FABRIC_DETAIL_URLS[this.material_type][ITEM_CW_LEVEL] + this.fabric_parent_id;
            case ITEM_CW_COUNTRY_FABRICS_LEVEL:
                return '' + this.fabric_parent_id;
            case ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL:
                return '' + this.fabric_parent_id
            default:
                return ''
        }
    }

    getUpdateUrl(record_id: number) {
        switch (this.level) {
            case ITEM_CW_LEVEL:
                return this.FABRIC_UPDATE_URLS[this.material_type][ITEM_CW_LEVEL] + record_id;
            case ITEM_CW_COUNTRY_FABRICS_LEVEL:
                return '' + this.fabric_parent_id;
            case ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL:
                return '' + this.fabric_parent_id
            default:
                return ''
        }
    }

    getCreateUrl() {
        switch (this.level) {
            case ITEM_CW_LEVEL:
                return this.FABRIC_CREATE_URLS[this.material_type][ITEM_CW_LEVEL];
            case ITEM_CW_COUNTRY_FABRICS_LEVEL:
                return '' + this.fabric_parent_id;
            case ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL:
                return '' + this.fabric_parent_id
            default:
                return ''
        }
    }

    getDeleteUrl() {
        switch (this.level) {
            case ITEM_CW_LEVEL:
                return this.FABRIC_DELETE_URLS[this.material_type][ITEM_CW_LEVEL];
            case ITEM_CW_COUNTRY_FABRICS_LEVEL:
                return '' + this.fabric_parent_id;
            case ITEM_CW_COUNTRY_SIZE_FABRICS_LEVEL:
                return '' + this.fabric_parent_id
            default:
                return ''
        }
    }

}

export function flattenResponse(response: any) {
    return {
        id: response.id,
        item_colorway: response.item_colorway,
        estimated_consumption: response.estimated_consumption,
        placement: response.placement,
        placement_name: '', //response.placement_name,
        placement_other: response.placement_other,
        color: response.color,
        details: response.details,
        description: response.description,
        customer_reference_code: response.customer_reference_code,
        composition: response.composition,
        gsm: response.gsm,
        order: response.order,
        fabric_detail_placement_id: response.fabric_detail_placement_id,
        fabric_detail_fabric_detail_id: response.fabric_detail_fabric_detail_id,
        fabric_id: response.fabric_id
    }
}


export function flattenResponseList(response: any) {
    let data = [];
    for (let i=0; i < response.length; i++) {
        data.push(flattenResponse(response[i]))
    }

    return data;
}

export function apifyResponse(data: any) {
    return {
        id: data.id,
        item_colorway: data.item_colorway,
        placement: data.placement,
        placement_name: '', //response.placement_name,
        placement_other: 'Other',
        color: data.color,
        details: 'Testerrs',
        description: data.description,
        customer_reference_code: data.customer_reference_code,
        composition: data.composition,
        gsm: data.gsm,
        order: data.order,
        fabric_detail_placement_id: 4,
        fabric_detail_fabric_detail_id: data.fabric_detail_fabric_detail_id,
        fabric_id: data.fabric_id,
        estimated_consumption: data.estimated_consumption,

    }
}

