import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { IconButton, Link } from "@mui/material";
import GetAppIcon from '@mui/icons-material/GetApp';


const POBomFiles = ({ clubId }: any) => {

    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'supplier_name',
            header: 'Supplier'
        },

        {
            accessorKey: 'attachment_display_name',
            header: 'Supplier Po Attachment',
            cell: ({ row }: { row: any }) => (
                <Link href={row.original.attachment_file_path} download={row.original.attachment_display_name}>
                    <IconButton size="small">
                        <GetAppIcon />
                    </IconButton>
                    {row.original.attachment_display_name}

                </Link>
            )
        }
    ];

    const router = useRouter();
    const [materialBomData, setMaterialBomData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const fetchPurchaseOrderPacks = () => {
        setIsLoading(true);
        const requests = [
            api.get(poRestUrls.supplierPOBomDetailsUrl(clubId)),
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
        if (clubId) {
            fetchPurchaseOrderPacks();
        }

    }, [clubId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> :
                <RitzTable columns={tableCols} data={materialBomData} />
            }

        </>
    )
}

export default POBomFiles;
