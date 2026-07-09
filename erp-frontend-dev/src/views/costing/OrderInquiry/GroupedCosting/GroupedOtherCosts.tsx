import {
    Box,
    Button,
    Card,
    CardHeader,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import * as React from "react";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import { IconButton } from "@mui/material";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import api from "@/services/api";
import { deleteOtherCostTypeURL, deleteSummaryOtherCostTypeURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { getDefaultError } from "@/helpers/Utilities";
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import { useEffect, useState } from "react";
import AddOtherCosts from "../OrderPack/AddOtherCosts";
import { getSummaryPackDetailsURL } from "@/helpers/constants/rest_urls/CostingUrls";

const DeleteDialog = ({
    costTypeId,
    open = false,
    setOpen,
    setUpdated,
    orderSizeGroupId,
    colorwayId,
    countryId
}: any) => {
    const deleteApi = deleteSummaryOtherCostTypeURL(costTypeId, countryId, colorwayId );
    const [isSaving, setIsSaving] = React.useState(false);

    const onClose = () => {
        setOpen(false);
    }

    const onDelete = () => {
        setIsSaving(true);

        api.post(deleteApi).then(() => {
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
            <AddOtherCosts
                orderId={props?.orderId}
                versionId={props?.versionId}
                packId={props?.packId}
                setUpdated={props?.setUpdated}
                costTypeId={props?.costTypeId}
                orderSizeGroupId={props?.orderSizeGroupId}
                colorwayId={props?.colorwayId}
                countryId={props?.countryId}
            />
        </RitzModal>
    )
}

const GroupedOtherCosts = ({ otherCosts, sizeHeaders, orderID, versionId, orderSizeGroupId, colorwayId, countryId, fetchData  }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [openDeleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
    const [openCostTypeModal, setOpenCostTypeModal] = useState(false);
    const [selectedCostType, setSelectedCostType] = useState(0);
    const [updated, setUpdated] = useState(false);
    const confirmationDeleteCostType = (modalStatus: any, deleteCostTypeId: any) => {
        setDeleteConfirmationModal(modalStatus);
        setSelectedCostType(deleteCostTypeId)

    }
    const editCostType = (modalStatus: any, CostTypeId: any) => {
        setOpenCostTypeModal(modalStatus);
        setSelectedCostType(CostTypeId)

    }
    const handleSavedStatus = () => {
        fetchData()
        setOpenCostTypeModal(false)

    }
    useEffect(() => {
        if (updated) {
            fetchData()
        }
    }, [updated]);

    return (
        <>
            <DeleteDialog
                open={openDeleteConfirmationModal}
                setOpen={setDeleteConfirmationModal}
                setUpdated={handleSavedStatus}
                costTypeId={selectedCostType}
                orderSizeGroupId={orderSizeGroupId}
                colorwayId={colorwayId}
                countryId={countryId}
            />
            <EditCostType
                open={openCostTypeModal}
                setOpen={setOpenCostTypeModal}
                orderId={orderID}
                versionId={versionId}
                costTypeId={selectedCostType}
                setUpdated={handleSavedStatus}
                orderSizeGroupId={orderSizeGroupId}
                colorwayId={colorwayId}
                countryId={countryId}
            />
            {otherCosts.length > 0 &&

                <Grid container columnSpacing={3} direction={'row'} key={keyHelper.getNextKeyValue()}>
                    <Grid item md={12} xs={12} sx={{width: '100%'}}>
                        <Box>
                            <Typography variant="h1" component="h2">Other Costs</Typography>
                        </Box>
                        <Card key={`${keyHelper.getNextKeyValue()}`} sx={{mb: 3}} variant='outlined'>
                            <CardHeader
                                title={`Other Costs`}
                                sx={{
                                    background: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                }}
                            />
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell></TableCell>
                                            <TableCell>Cost Type</TableCell>
                                            {
                                                sizeHeaders.map((sizeHeader: any) => (
                                                    <TableCell sx={{ width: '200px' }}>{sizeHeader?.['label']}</TableCell>
                                                ))
                                            }
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {
                                            otherCosts?.map((otherCost: any) => (
                                                <TableRow>
                                                    <TableCell style={{ width: 120 }}><IconButton size='small' color='primary' onClick={() => { confirmationDeleteCostType(true, otherCost.cost_type_id,) }}>
                                                        <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                                    </IconButton>
                                                        <IconButton size='small' color='primary' onClick={() => { editCostType(true, otherCost.cost_type_id,) }} >
                                                            <ModeEditIcon fontSize='inherit' />
                                                        </IconButton></TableCell>
                                                    <TableCell>

                                                        {otherCost?.['cost_type_name']}</TableCell>
                                                    {
                                                        sizeHeaders.map((sizeHeader: any) => (
                                                            <TableCell>{otherCost?.[sizeHeader?.['pack_id']]}</TableCell>
                                                        ))
                                                    }
                                                </TableRow>
                                            ))
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    </Grid>
                </Grid>
            }

        </>
    )

}

export default GroupedOtherCosts;