import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, useTheme, Checkbox, Divider, RadioGroup, FormControlLabel, Radio, Alert, Button, Grid } from "@mui/material";
import CircularLoader from "@/components/CircularLoader";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import api from "@/services/api";
import { costingMaterialDetailsURL, costingMaterialListURL, orderPackPlacementDetailsURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import RitzModal from "@/components/Ritz/RitzModal";
import SupplierInquirySelection from "./SupplierInquirySelection";

const SupplierInquiryDetailsAnalyse = ({ orderId, versionId }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabrics'
    const sewingTrimsKey = 'sewing_trims'
    const packagingKey = 'packaging'

    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [isOpenEditSupplierModal, setIsOpenEditSupplierModal] = useState(false);
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ selectedMaterial: null });
    const [supplierMaterialDetails, setSupplierMaterialDetails] = useState<any>({})
    const [materialDetails, setMaterialDetails] = useState<any>({})
    const [checkValues, setCheckValues] = useState<any>([]);

    const loadData = () => {
        setIsLoadingCircularLoader(true);
        api.get(costingMaterialDetailsURL(orderId, versionId, selectedCheckBoxValues?.selectedMaterial))
            .then(response => {
                const supplierData = response?.data || [];
                setSupplierMaterialDetails({...supplierData});
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
                setIsLoadingCircularLoader(false);
            });
    };

    const fetchData = () => {
        const requests = [
            api.get(costingMaterialListURL(orderId, versionId)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [materialData] = respData;
            setMaterialDetails({ ...materialData })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleItemChange = (event: any) => {
        const selectedValue = Number(event.target.value);
        setSelectedCheckBoxValues((prevState) => ({
            ...prevState,
            selectedMaterial: selectedValue,
        }));
    };

    const handleOpenEditSupplierModal = (status: any) => {
        setIsOpenEditSupplierModal(status)
    }

    const handlePlacementCheckboxChange = (id: string) => {
        setCheckValues((prevCheckValues: any) => {
            if (prevCheckValues.includes(id)) {
                return prevCheckValues.filter((value: any) => value !== id);
            } else {
                return [...prevCheckValues, id];
            }
        });
    }
    const handleRefreshData = (status: any) => {
        loadData();
        if (!status) {
            handleOpenEditSupplierModal(false);
        }
    };

    useEffect(() => {
        if (selectedCheckBoxValues?.selectedMaterial) {
            loadData();
        }
    }, [selectedCheckBoxValues]);

    useEffect(() => {
        fetchData()
    }, [orderId]);

    return (
        <>
            {isOpenEditSupplierModal && (
                <RitzModal
                    title={'Select Supplier'}
                    open={isOpenEditSupplierModal}
                    onClose={()=>{handleOpenEditSupplierModal(false)}}
                    maxWidth='xl'
                    fullWidth={true}
                >
                    <SupplierInquirySelection orderId={orderId} versionId={versionId} supplierInquiryData={supplierMaterialDetails?.all_inquiries} checkedIds={checkValues} refreshData={handleRefreshData} />
                </RitzModal>
            )}
            {isLoadingCircularLoader && <CircularLoader />}
            {showMaterialDetailsModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
                    modalOpen={showMaterialDetailsModal?.modalStatus}
                    setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
                />
            }
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <Box sx={{ mt: 2, p: 2 }}>
                    <Box>
                        <Typography variant="h6">Select Material :</Typography>
                        {Object.keys(materialDetails)?.map((categoryKey: string) => {
                            const materialCategory = materialDetails[categoryKey];
                            return (
                                <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ mt: 1 }}>
                                    <Typography variant="h6" color={'primary'}>
                                        {categoryKey === fabricsKey
                                            ? "Fabric"
                                            : categoryKey === packagingKey
                                                ? "Packaging"
                                                : categoryKey === sewingTrimsKey
                                                    ? "Sewing Trim"
                                                    : "New Category"}
                                    </Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <RadioGroup
                                            value={selectedCheckBoxValues?.selectedMaterial}
                                            onChange={handleItemChange}
                                            row
                                        >
                                            <Grid container spacing={2}>
                                                {materialCategory?.map((item: any, itemIndex: number) => (
                                                    <Grid item xs={12} sm={6} md={3} key={`material-${itemIndex}`}>
                                                        <FormControlLabel
                                                            value={item?.material_details?.customer_brand_material_id}
                                                            control={<Radio />}
                                                            label={
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Typography>
                                                                        {item.material_details?.ritz_customer_brand_reference_code}
                                                                    </Typography>
                                                                    <OpenInNewIcon
                                                                        sx={{
                                                                            position: 'relative',
                                                                            top: '0px',
                                                                            ml: 1,
                                                                            color: 'rgb(25, 118, 210)',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        onClick={() =>
                                                                            setShowMaterialDetailsModal({
                                                                                modalStatus: true,
                                                                                materialId: item?.material_details?.customer_brand_material_id,
                                                                            })
                                                                        }
                                                                    />
                                                                </Box>
                                                            }
                                                        />
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </RadioGroup>
                                    </Box>
                                </Box>
                            );
                        })}

                    </Box>
                    <Divider
                        sx={{ borderWidth: 2, my: 2 }}
                    />
                    <Box>
                        {!selectedCheckBoxValues?.selectedMaterial ? (
                            <>
                                <Alert severity="info">
                                    Please select material to see the supplier details.
                                </Alert>
                            </>
                        ) : (
                            <>
                                <Box display="flex" justifyContent="flex-end">
                                    <Button onClick={() => {handleOpenEditSupplierModal(true)}} sx={{ mb: 1 }} variant="contained" color="primary">Edit</Button>
                                </Box>
                                {
                                    <Table>
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    background: theme.palette.grey[200],
                                                    border: (theme) => `1px solid ${theme.palette.grey[100]}`,
                                                }}
                                            >
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material Category</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Ritz Reference Code</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Colorway</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Supplier</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Cost Per Unit</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Costing Unit Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Pay Mode</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {supplierMaterialDetails?.colorway_supplier_inquiries?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell>
                                                </TableRow>
                                            ) : (
                                                supplierMaterialDetails?.colorway_supplier_inquiries?.map((supplierData: any, supplierDataIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                            <Checkbox
                                                                sx={{ p: 0, mr: 1 }}
                                                                checked={checkValues.includes(supplierData?.id)}
                                                                onChange={(e) => handlePlacementCheckboxChange(supplierData?.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.material_details?.material_label}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.material_details?.ritz_customer_brand_reference_code}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.order_colorway?.name}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.supplier_inquiry_details?.supplier_name}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.supplier_inquiry_details?.cost_per_unit} {supplierData?.supplier_inquiry_details?.costing_unit_display} </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.supplier_inquiry_details?.cost_per_unit_type_display}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierData?.supplier_inquiry_details?.pay_mode_display}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}

                                        </TableBody>
                                    </Table>

                                }
                            </>
                        )}
                    </Box>
                </Box>
            )}
        </>
    );
};

export default SupplierInquiryDetailsAnalyse;