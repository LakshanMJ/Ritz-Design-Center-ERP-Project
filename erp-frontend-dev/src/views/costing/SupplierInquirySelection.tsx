import React, { useEffect, useState } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, useTheme, Radio, Button, IconButton, } from "@mui/material";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { costingMaterialSupplierInquirySaveURL } from "@/helpers/constants/RestUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import EditIcon from '@mui/icons-material/Edit';
import ReplyModal from "./SupplierInquiry/ReplyModal";
import * as supplierUrls from '@/helpers/constants/rest_urls/SupplierUrls';
import { paymentModesListURL } from "@/helpers/constants/rest_urls/FinanceUrls";

const SupplierInquirySelection = ({ orderId, versionId, supplierInquiryData, checkedIds, refreshData }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<any>(null);
    const [replyModalOpen, setReplyModalOpen] = useState<any>({});
    const [suppliers, setSuppliers] = useState([]);
    const [consumptionData, setConsumptionData] = useState({});
    const [costPerUnitTypes, setCostPerUnitTypes] = useState<any>([]);
    const [transportTypes, setTransportTypes] = useState<any>([]);
    const [payModes, setPayModes] = useState<any>([]);

    const handleSaveSupplier = () => {
        const dataSet = {
            colorway_ids: checkedIds,
            supplier_inquiry_detail_id: selectedSupplierId
        }
        api.post(costingMaterialSupplierInquirySaveURL(orderId, versionId), dataSet).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    }
    const fetchData = () => {
        Promise.all([
            api.get(supplierUrls.getActiveSuppliersURL()),
            api.get(supplierUrls.getConsumptionUnits()),
            api.get(supplierUrls.getCostPerUnitTypesURL()),
            api.get(supplierUrls.getTransportTypesURL()),
            api.get(paymentModesListURL()),
        ]).then(resp => {
            const respData = resp?.map(r => r.data);
            const [supplierData, consumptionData, costPerUnitTypes, transportTypes, payModes] = respData;
            setSuppliers(supplierData || []);
            setConsumptionData(consumptionData || {});
            setCostPerUnitTypes([...costPerUnitTypes])
            setTransportTypes([...transportTypes])
            setPayModes([...payModes])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const handleSavedData = () => {
         refreshData(true)
    }
    const handleEditSupplier = (supplierId:any, selectedSupplierInquiryDetailId: any, selectedSupplierInquiryId: any) => {
        setReplyModalOpen({ 
            modalOpen: true, 
            selectedSupplierId: supplierId, 
            selectedSupplierInquiryDetailId: selectedSupplierInquiryDetailId, 
            selectedSupplierInquiryId: selectedSupplierInquiryId 
        })
    }
    useEffect(() => {
        fetchData()
    }, []);
    return (
        <>
            {replyModalOpen?.modalOpen && (
                <ReplyModal
                    orderId={orderId}
                    versionId={versionId}
                    consumptionData={consumptionData}
                    costPerUnitTypes={costPerUnitTypes}
                    transportTypes={transportTypes}
                    payModes={payModes}
                    modalOpen={replyModalOpen.modalOpen}
                    setModalOpen={setReplyModalOpen}
                    refreshData={refreshData}
                    savedData={handleSavedData}
                    suppliers={suppliers}
                    selectedSupplierId={replyModalOpen?.selectedSupplierId}
                    selectedSupplierInquiryDetailId={replyModalOpen?.selectedSupplierInquiryDetailId}
                    selectedSupplierInquiryId={replyModalOpen?.selectedSupplierInquiryId}
                />
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mt: 1 }}>
                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        background: theme.palette.grey[200],
                                        border: (theme) => `1px solid ${theme.palette.grey[100]}`,
                                    }}
                                >
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Selection</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Ex-Work Price</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>FOB Price</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>CIF Price</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Transport Charges</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Ship Mode</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Cost Per Unit</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Costing Unit</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Costing Unit Type</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Price Validity Date</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Lead Time</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>MOQ</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>MOQ Unit</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Excess Threshold</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Supplier Ref Code</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Edit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {supplierInquiryData?.map((supplier: any, supplierIndex: any) => (
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                            <Radio
                                                checked={selectedSupplierId === supplier?.supplier_inquiry_detail}
                                                onChange={() => setSelectedSupplierId(supplier?.supplier_inquiry_detail)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.ex_work_price}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.fob_price}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.cif_price}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.transport_charges}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.ship_mode}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.cost_per_unit}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.costing_unit_display}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.cost_per_unit_type_display}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.expiration_date}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.lead_time}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.minimum_order_quantity}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.minimum_order_quantity_units}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.excess_threshold}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_material_reference_code}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <IconButton
                                                onClick={() => handleEditSupplier(supplier?.supplier_id, supplier?.id, supplier?.supplier_inquiry)}
                                                size='small'
                                                color="primary"
                                            >
                                                <EditIcon fontSize='inherit' />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveSupplier}
                            size="small"
                            color="primary"
                        > Save</Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default SupplierInquirySelection;