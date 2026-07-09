import React, { useEffect, useRef, useState } from 'react';
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { getDefaultError } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { IconButton } from "@mui/material";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzModal from '@/components/Ritz/RitzModal';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import AddOtherCosts from '@/views/costing/OrderInquiry/OrderPack/AddOtherCosts';

const DeleteDialog = ({
    costTypeId,
    open = false,
    setOpen,
    setUpdated
}: any) => {

    const deleteApi = restUrls.deleteOtherCostTypeURL(costTypeId);
    const [isSaving, setIsSaving] = useState(false);

    const onClose = () => {
        setOpen(false);
    }

    const onDelete = () => {
        setIsSaving(true);

        api.delete(deleteApi).then(() => {
            setOpen(false);
            setUpdated(true);
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };

    return (
        <RitzModal open={open} title='Delete Other Cost Type' onClose={onClose} maxWidth='xs'>
            Are you sure you want to delete this other cost type ?
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onDelete} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Delete
                </Button>
            </Box>
        </RitzModal>
    )
}

const EditCostType =(props: any)=> {
    const onClose = () => {
        props?.setOpen(false);
    }
    return (
        <RitzModal
            open={props?.open}
            title={'Other Cost Details'}
            onClose={onClose}
            maxWidth='lg'
        >
            <AddOtherCosts orderId={props?.orderId} versionId={props?.versionId} packId={props?.packId}  setUpdated={props?.setUpdated} costTypeId={props?.costTypeId}/>
        </RitzModal>
    )
}


const OtherCostList = ({ packId, orderId, versionId }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [otherCosts, setOtherCosts] = useState([]);
    const [openDeleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
    const [openCostTypeModal, setOpenCostTypeModal] = useState(false);
    const [selectedCostType, setSelectedCostType] = useState(0);
    const [updated, setUpdated] = useState(false);

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOtherCostListURL(packId)),
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [otherCosts] = respData;
            setOtherCosts([...otherCosts]);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const confirmationDeleteCostType = (modalStatus: any, deleteCostTypeId: any) => {
        setDeleteConfirmationModal(modalStatus);
        setSelectedCostType(deleteCostTypeId)

    }
    const editCostType = (modalStatus: any, CostTypeId: any) => {
        setOpenCostTypeModal(modalStatus);
        setSelectedCostType(CostTypeId)

    }
    useEffect(() => {
        if (packId) {
            fetchData()
        }
    }, [packId]);

    useEffect(() => {
        if (updated) {
            setUpdated(false);
            setOpenCostTypeModal(false)
            fetchData();

        }
    }, [updated]);



    return (
        <>
            <DeleteDialog
                open={openDeleteConfirmationModal}
                setOpen={setDeleteConfirmationModal}
                setUpdated={setUpdated}
                costTypeId={selectedCostType}
            />
            <EditCostType
                open={openCostTypeModal}
                setOpen={setOpenCostTypeModal}
                orderId={orderId}
                versionId={versionId}
                costTypeId={selectedCostType}
                setUpdated={setUpdated}
                packId={packId}
            />
            {isLoading ? <DefaultLoader /> :
                <TableContainer component={Card} variant='outlined'>
                    <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell width={'100px'}></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        Other Cost Type
                                    </Box>
                                </TableCell>
                                <TableCell>Other Cost</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                otherCosts.map((type: any, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <IconButton size='small' color='primary' onClick={() => { confirmationDeleteCostType(true, type.id,) }}>
                                                <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                            </IconButton>
                                            <IconButton size='small' color='primary' onClick={() => { editCostType(true, type.other_cost_type,) }} >
                                                <ModeEditIcon fontSize='inherit' />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>{type.other_cost_type_name}</TableCell>
                                        <TableCell>{type.cost || "N/A"}</TableCell>

                                    </TableRow>
                                ))
                            }
                            {
                                otherCosts.length == 0 &&
                                <TableRow>
                                    <TableCell></TableCell>
                                    <TableCell align="center" colSpan={3}>There are no cost type defined.</TableCell>
                                </TableRow>
                            }

                        </TableBody>
                    </Table>
                </TableContainer>
            }

        </>
    );
};

export default OtherCostList;