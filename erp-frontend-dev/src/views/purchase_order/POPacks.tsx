import {useRouter} from "next/router";
import {ColumnDef} from "@tanstack/react-table";
import RitzTable from "@/components/Ritz/RitzTable";
import EditIcon from "@mui/icons-material/Edit";
import * as frontEndUrls from "@/helpers/constants/FrontEndUrls";
import { IconButton } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from "react";
import RitzModal from "@/components/Ritz/RitzModal";
import PostCostingSummary from "./PostCostingSummary";
import PackSummary from "./PackSummary";


const POPacks = ({ purchaseOrderId, poPackData, orderId, versionId, purchaseOrderState, editableStatus }: any) => {
    const [openPostCostingSummary, setOpenPostCostingSummary] = useState<any>({ modalStatus: false, selectedPostCostingPackId: null, selectedPreCostingPackId: null, selectedMarketingCostingId: null });
    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'po_colorway.po_colorway_name',
            header: 'Colorway'
        },
        {
            accessorKey: 'po_country.po_country_name',
            header: 'Country'
        },
        {
            accessorKey: 'po_size.po_size_name',
            header: 'Size'
        },
        {
            accessorKey: 'quantity',
            header: 'Quantity'
        },
        {
            accessorKey: 'id',
            header: 'Summary',
            cell: props => (
                <IconButton size='small' color='primary' onClick={() =>{
                    handleOpenSummaryModal(
                        true, 
                        props?.row?.original?.id, 
                        props?.row?.original?.marketing_costing_order_pack_id, 
                        props?.row?.original?.pre_costing_order_pack_id, 
                        props?.row?.original?.marketing_costing_version_id,
                        props?.row?.original?.marketing_costing_version_order_id,
                    )}}>
                    <VisibilityIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    // if (purchaseOrderState !== 'open' && !editableStatus) {
    //     tableCols.push({
    //         accessorKey: 'id',
    //         header: 'Edit',
    //         cell: props => (
    //             <IconButton size='small' color='primary' onClick={() => handlePackOnClick(props)} disabled={editableStatus}>
    //                 <EditIcon fontSize='inherit' />
    //             </IconButton>
               
    //         ),
    //     });
    // }

    const router = useRouter();

    const handlePackOnClick = (props: any) => {
        router.push(frontEndUrls.purchaseOrderMaterialPackURL(purchaseOrderId, props?.row?.original?.id))
    }
    const handleOpenSummaryModal = (status: any, postCostingPackId: any, marketingCostingPackId: any, preCostingPackId: any, marketingCostingVersion: any, marketingCostingOrder: any) => {
        setOpenPostCostingSummary({ 
            modalStatus: status, 
            selectedPostCostingPackId: postCostingPackId, 
            selectedMarketingCostingId: marketingCostingPackId, 
            selectedPreCostingPackId: preCostingPackId ,
            selectedMarketingCostingVersion: marketingCostingVersion, 
            selectedMarketingCostingOrder: marketingCostingOrder
        })
    }


    return (
    <>
    {openPostCostingSummary?.modalStatus &&(
        <RitzModal
            onClose={() => setOpenPostCostingSummary({ modalStatus: false, selectedPostCostingPackId: null, selectedMarketingCostingId: null, selectedPreCostingPackId: null, selectedMarketingCostingVersion: null, selectedMarketingCostingOrder: null })}
            title={"Summary Sheet"}
            open={openPostCostingSummary?.modalStatus}
            maxWidth='xl'
            fullWidth={true}
        >
            <PackSummary 
                postCostingPackId={openPostCostingSummary?.selectedPostCostingPackId} 
                marketingCostingPackId={openPostCostingSummary?.selectedMarketingCostingId}
                preCostingPackId={openPostCostingSummary?.selectedPreCostingPackId}
                marketingCostingOrder={openPostCostingSummary?.selectedMarketingCostingOrder}
                marketingCostingVersion={openPostCostingSummary?.selectedMarketingCostingVersion}
                orderId={orderId} 
                versionId={versionId} 
            />
        </RitzModal>
    )}
        <RitzTable columns={tableCols} data={poPackData} enableGlobalFilter={false} enableColumnFilter={false} pagination={false} hideSorting={true} />
    </>
    )
}

export default POPacks;
