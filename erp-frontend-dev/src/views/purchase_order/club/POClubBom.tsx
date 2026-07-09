import React, {useEffect, useState} from "react";
import router, {useRouter} from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import {toast} from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import {ColumnDef} from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";


const POBom = ({ clubId, filterData }: any) => {
    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'material_details.material_label',
            header: 'Material'
        },
        {
            accessorKey: 'material_details.ritz_customer_brand_reference_code',
            header: 'Ritz Reference Code'
        },
        {
            accessorKey: 'material_details.reference_code',
            header: 'Customer Reference Code'
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier'
        },
        {
            accessorKey: 'quantity_display_value',
            header: 'Quantity'
        },

    ];

    const router = useRouter();
    const [materialBomData, setMaterialBomData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPurchaseOrderPacks = () => {
        setIsLoading(true);
        const requests = [
            api.get(poRestUrls.poClubingBomMaterialsUrl(clubId)),
        ];

        Promise.all(requests).then(response => {
            const respData = response.map(r => r.data);
            const [bomData] = respData;
            setMaterialBomData(bomData);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }


    useEffect(() => {
        if (clubId && filterData?.length == 0) {
            fetchPurchaseOrderPacks();
        }
        else {
            setMaterialBomData(filterData)
        }
    }, [clubId, filterData]);

    return (
        <>
            {isLoading ? <DefaultLoader /> :
                <RitzTable columns={tableCols} data={materialBomData} />
            }

        </>
    )
}

export default POBom;
