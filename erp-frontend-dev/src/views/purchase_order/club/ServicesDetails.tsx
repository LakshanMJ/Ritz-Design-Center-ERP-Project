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
import ActualServiceData from "./ActualServiceData";

const ServicesDetails = ({ clubId }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [serviceEditModal, setServiceEditModal] = useState<any>({modalStatus: false, serviceId: null});
    const [serviceDataDetails, setServiceDataDetails] = useState<any>([]);
    const tableCols: ColumnDef<any>[] = [
        {
            header: 'Status',
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
            accessorKey: 'item_name',
            header: 'Item Description'
        },
        {
            accessorKey: 'colorway',
            header: 'Colorway'
        },
        {
            accessorKey: 'service_detail.type',
            header: 'Service Type',
            cell: (props) => {
                return (
                    <>
                        {props?.row?.original?.service_detail?.technique? props.row.original?.service_detail?.technique : props.row.original?.service_detail?.type}
                    </>
                );
            },
        },
        {
            accessorKey: 'colorway',
            header: 'Colorway'
        },
        {
            accessorKey: 'country',
            header: 'Country'
        },
        {
            accessorKey: 'size',
            header: 'Size'
        },
        {
            accessorKey: 'quantity',
            header: 'Quantity',
            cell: (props) => {
                return (
                    <>
                       {props?.row?.original?.quantity.quantity} {props?.row?.original?.quantity?.quantity_units_display}
                    </>
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        },
        {
            accessorKey: "id",
            header: 'Action',
            cell: (props) => {
                return (
                    <>
                        <IconButton size='small' color='primary' onClick={() => { handleOpenEditModal(true, props?.row?.original?.id ) }}>
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

    const fetchData = () => {
        const requests = [
            api.get(poRestUrls.poClubServicePOListURL(clubId)),
        ];
        Promise.all(requests).then(response => {
            const respData = response.map(r => r.data);
            const [serviceDataList] = respData;
            setServiceDataDetails([...serviceDataList]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleOpenEditModal = (open: boolean, seriveId: any) => {
        setServiceEditModal({modalStatus: open, serviceId: seriveId});
    }

    const handleSavedActualServiceModalDetails = (status: any) => {
        if(status){
            handleOpenEditModal(false, null);  
        }
        fetchData();
    }

    useEffect(() => {
        if (clubId) {
            fetchData();
        }

    }, [clubId]);

    return (
        <>
            {serviceEditModal?.modalStatus && (
                <RitzModal open={serviceEditModal?.modalStatus} onClose={() => { setServiceEditModal({modalStatus: false, serviceId: null}) }} title='Edit Service Changes' maxWidth={'xl'} >
                    <ActualServiceData serviceId={serviceEditModal?.serviceId} serviceDataList={serviceDataDetails} refreshData={handleSavedActualServiceModalDetails} />
                </RitzModal>
            )}
            {isLoading ? <DefaultLoader /> :
                <RitzTable columns={tableCols} data={serviceDataDetails} />
            }

        </>
    )
}

export default ServicesDetails;
