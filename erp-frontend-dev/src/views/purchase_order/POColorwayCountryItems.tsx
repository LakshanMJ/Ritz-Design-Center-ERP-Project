import React, {useEffect, useState} from "react";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/rest_urls/POUrls";
import {toast} from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import { Card, Link, Table, TableBody, TableCell, TableHead, TableRow} from "@mui/material";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import EditIcon from "@mui/icons-material/Edit";
import RitzModal from "@/components/Ritz/RitzModal";
import POCountryColorwayItemMaterials
    from "@/views/purchase_order/country_colorway_materials/POCountryColorwayItemMaterials";
import * as frontEndUrls from "@/helpers/constants/front_end/POUrls";


const POPacks = ({ purchaseOrderId }: any) => {
    const poColorwayCountriesDataKey = 'po_colorway_countries';
    const poItemsDataKey = 'po_items';
    const poCountryNameKey = 'po_country_name';
    const poColorwayNameKey = 'po_colorway_name';
    const poItemNameKey = 'po_item_name';
    const packItemType = 'packitem';
    const packType = 'pack';

    const [colorwayCountryItems, setColorwayCountryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false)
    const [materialModalProps, setMaterialModalProps] = useState<any>({});



    const keyHelper = new ReactKeyHelper();

    const fetchPurchaseOrderColorwayCountryItems = () => {
        setIsLoading(true);

        const requests = [
            api.get(restUrls.purchaseOrderColorwayCountryItemURL(purchaseOrderId)),
        ];

        Promise.all(requests).then(response => {
            const respData = response.map(r => r.data);
            const [packData] = respData;

            setColorwayCountryItems(packData);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (purchaseOrderId) {
            fetchPurchaseOrderColorwayCountryItems();
        }
    }, [purchaseOrderId]);

    const handleColorwayCountryMaterialEdit = (poColorwayCountry: any, poItem: any) => {

        const placementMaterialURL = restUrls.purchaseOrderColorwayCountryItemPlacementDataURL(purchaseOrderId, poItem.po_item_id, poColorwayCountry.po_colorway_id, poColorwayCountry.po_country_id);
        setMaterialModalProps({dataGetUrl: placementMaterialURL})
        setEditModalVisible(true);
    }

    return (
    <>
        {isLoading ? <DefaultLoader/> :
            <Table component={Card}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "40%"}}>Colorway</TableCell>
                        <TableCell style={{width: "40%"}}>Country</TableCell>
                        <TableCell>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        colorwayCountryItems?.[poColorwayCountriesDataKey]?.map((poColorwayCountry: any, poColorwayCountryIndex: number) => (
                                <TableRow key={keyHelper.getNextKeyValue()}>

                                    <TableCell>{poColorwayCountry?.[poColorwayNameKey]}</TableCell>
                                    <TableCell>{poColorwayCountry?.[poCountryNameKey]}</TableCell>
                                    <TableCell>
                                        <Link href={frontEndUrls.poColorwayCountryPackagingMaterialUrl(purchaseOrderId, poColorwayCountry.po_colorway_id, poColorwayCountry.po_country_id)}><EditIcon fontSize='inherit' /></Link>
                                    </TableCell>
                                </TableRow>

                            ))
                    }
                </TableBody>
              </Table>
        }
        <RitzModal open={editModalVisible} onClose={() => setEditModalVisible(false)} maxWidth='lg' fullWidth={true} title={"Edit Material"}>
            <POCountryColorwayItemMaterials purchaseOrderId={purchaseOrderId} dataGetUrl={materialModalProps?.dataGetUrl} saveDataURL={'saveDataURL'} />
        </RitzModal>
    </>
    )
}

export default POPacks;
