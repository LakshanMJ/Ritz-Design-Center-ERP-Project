import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogTitle, Grid, IconButton, Link, Typography } from "@mui/material";
import * as RestUrls from '../../helpers/constants/RestUrls';
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { TabContext } from "@mui/lab";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { getDefaultError, hasRole } from "@/helpers/Utilities";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import PoClub from "./PoClub";
import { ColumnDef } from "@tanstack/react-table";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import EditIcon from '@mui/icons-material/Edit';
import RitzTable from "@/components/Ritz/RitzTable";
import { purchaseOrderClubDetailsURL } from "@/helpers/constants/rest_urls/POUrls";


const PurchaseOrderUploadDetails = ({ purchaseOrderUploadId }: any) => {
    const [summaryTabs, setSummaryTabs] = useState(['PO Details', 'PO Clubing Details']);
    const [activeTab, setActiveTab] = useState('1');
    const [uploadPurchaseOrdersList, setUploadPurchaseOrdersList] = useState<any>([]);
    const [componentData, setComponentData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    };

    const getPurchaseOrderDetails = () => {
        const requests = [
            api.get(purchaseOrderClubDetailsURL(purchaseOrderUploadId)),
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [uploadedPoDetails] = respData;
            setComponentData(uploadedPoDetails)
            setUploadPurchaseOrdersList(uploadedPoDetails.purchaseorder_set)

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Purchase Order Name',
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer Name',
        },
        {
            accessorKey: 'brand_name',
            header: 'Brand Name',
        },
        {
            accessorKey: 'order_id',
            header: 'Costing Order',
        },
        {
            accessorKey: 'version_name',
            header: 'Version',
        },
        {
            accessorKey: 'state',
            header: 'Status',
        },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: (props) => {
                const { id } = props.row.original;
                return (
                    <IconButton size='small' color='primary' onClick={() => { handleOrderDetailPageUrl(id) }}>
                        <EditIcon fontSize='inherit' />
                    </IconButton>
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const handleOrderDetailPageUrl = (id: any) => {
        router.push(purchaseOrderDetailPageURL(id))

    }
    
    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    useEffect(() => {
        if (purchaseOrderUploadId) {
            getPurchaseOrderDetails();
        }

    }, [purchaseOrderUploadId]);

    return (
        <>
            <TabContext value={activeTab}>
                <RitzTabs
                    tabs={summaryTabs}
                    activeTab={activeTab}
                    emitChange={handleChangeTabs}
                />
                <RitzTabPanel value='1'>
                    {isLoading ? (
                        <DefaultLoader />
                    ) : (
                        <>
                            <RitzTable
                                data={uploadPurchaseOrdersList}
                                columns={columns}
                            />
                        </>
                    )}
                </RitzTabPanel>
                <RitzTabPanel value='2'>
                    {isLoading ? (
                        <DefaultLoader />
                    ) : (
                        <>
                            <PoClub purchaseOrderUploadId={purchaseOrderUploadId} />
                        </>
                    )}
                </RitzTabPanel>
            </TabContext>
        </>
    )
}

export default PurchaseOrderUploadDetails;
