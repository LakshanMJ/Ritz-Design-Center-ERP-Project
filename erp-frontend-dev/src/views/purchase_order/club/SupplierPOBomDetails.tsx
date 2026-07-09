import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { IconButton } from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from "@/components/Ritz/RitzModal";
import ActualSupplierData from "@/views/purchase_order/club/ActualSupplierData";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';



const POBom = ({ clubId }: any) => {
    const tableCols: ColumnDef<any>[] = [
        {
            header: 'Delivery Date Status',
            cell: (props) => {
                const deliveryDate = props.row.original.completed
                if (deliveryDate===true) {
                    return <CheckIcon sx={{ color: 'green' }}/>
                  } else {
                    return <CloseIcon sx={{ color: 'red' }}/>
                  }
            
            },
        },
        {
            accessorKey: 'materail_name',
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
        {
            accessorKey: "id",
            header: 'Action',
            cell: (props) => {
                const { id, material, quantity } = props.row.original;
                return (
                <>
                    <IconButton size='small' color='primary' onClick={() => { handleOpenSupplierModal(id, material, quantity) }}>
                        <EditIcon fontSize='inherit' />
                    </IconButton>
                </>    
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        },
        

    ];

    const router = useRouter();
    const [materialBomData, setMaterialBomData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actualSupplierModal, setactualSupplierModal] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(0);
    const [selectedGeneralPoId, setSelectedGeneralPoId] = useState(0);
    const [selectedTotQty, setSelectedTotQty] = useState(0);
    

    const fetchPurchaseOrderPacks = () => {
        const requests = [
            api.get(poRestUrls.poClubBomMaterialsUrl(clubId)),
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

    const handleOpenSupplierModal = (id: any, materialId:any, totalQty:any) => {
        setSelectedMaterialId(materialId)
        setSelectedGeneralPoId(id)
        setSelectedTotQty(totalQty)
        setactualSupplierModal(true)

    }
    const handleCloseActualSupplierModal = () => {
        setactualSupplierModal(false)
    }
    const handleSavedActualSupplierModalDetails = (status: any, generalPoQuantityId: any) => {
        if(status){
            handleCloseActualSupplierModal()  
        }
        fetchPurchaseOrderPacks()
    }

    useEffect(() => {
        if (clubId) {
            fetchPurchaseOrderPacks();
        }
      
    }, [clubId]);

    return (
        <>
            {actualSupplierModal && (
                <RitzModal open={actualSupplierModal} onClose={handleCloseActualSupplierModal} title='Edit Supplier Changes' maxWidth={'lg'} >
                    <ActualSupplierData materialId={selectedMaterialId}  generalPoId={selectedGeneralPoId} savedDetails={handleSavedActualSupplierModalDetails} supplierBOMMaterialIds={materialBomData}/>
                </RitzModal>
            )}
            {isLoading ? <DefaultLoader /> :
                <RitzTable columns={tableCols} data={materialBomData} />
            }

        </>
    )
}

export default POBom;
