import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import RitzInput from "@/components/Ritz/RitzInput";
import {
    apifyUIStateGeneralPOCWQuantityMatrixList,
    getCWQuantiMatrixInputName,
    processGeneralPoQuantityMatrixAPIResponse,
    processQuantityMatrixAPIResponse,
} from "@/helpers/costings/QuantityMatrix";
import DefaultLoader from "@/components/DefaultLoader";
import CostingFormLayout from "../../components/OrderInquiry/Costing/CostingForm";
import { lightBlue } from "@mui/material/colors";
import { Card, alpha, darken, Box, Button, Typography } from "@mui/material";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import FormErrorMessage from "@/components/FormErrorMessage";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import SaveSpinner from "@/components/SaveSpinner";
import { debug } from "console";
import { createdGeneralPOQuantityDetailsURL, costingGeneralPOQuantityDetailsURL, generalPORatioQuantityDeailsURL, saveGeneralPOQuantityDetailsURL, updateGeneralPOQuantityDetailsURL } from "@/helpers/constants/rest_urls/POUrls";
import { generalPurchaseOrderDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { useRouter } from "next/router";
import LightColorsHelper from "@/helpers/purchaseOrder/LightColorsHelper";


const GeneralPurchaseOrder = ({ orderId, versionId, generalPOId, modalType, exitingMaterialData, loadExitingMaterial, closeModal }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [generaPODetails, setGeneraPODetails] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCells, setSelectedCells] = useState([]);
    const [errors, setErrors] = useState([]);

    const fetchData = () => {
        const requests = [];

        if (generalPOId) {
            requests.push(api.get(createdGeneralPOQuantityDetailsURL(generalPOId)));
        } else {
            requests.push(api.get(costingGeneralPOQuantityDetailsURL(versionId)));
        }

        Promise.all(requests)
            .then(resp => {
                const respData = resp.map(r => r.data);
                const [generalPODetails] = respData;
                setGeneraPODetails({ ...generalPODetails })
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const saveCWQuantityMatrix = () => {
        setIsSaving(true);
        setErrors([]);
        const dataList = {
            quantities: generaPODetails?.quantities
        };
        api.post(saveGeneralPOQuantityDetailsURL(versionId), dataList).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            const generalPoId = resp.data.general_po_id;
            if(generalPoId){
                const url = generalPurchaseOrderDetailsPageURL(generalPoId);
                const newWindow = window.open(url, '_blank');
                if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                    window.location.href = url;
                }
              //  handleOpenURL(generalPoId)
            }
            closeModal();

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleOpenURL = (generalPoId: any) => {
        router.push(generalPurchaseOrderDetailsPageURL(generalPoId));
    };

    const updateCWQuantityMatrix = (generalPoId: any) => {
        setIsSaving(true);
        setErrors([]);
        let quantitiesType;
        
        if(modalType == 'discrepancy_reasons'){
            quantitiesType = true;
        }
        else{
            quantitiesType = false;
        }
        const dataList = {
            quantities: generaPODetails?.quantities,
            quantities_changed: quantitiesType

        };
        api.post(updateGeneralPOQuantityDetailsURL(generalPoId), dataList).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            closeModal()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const getErrors = (countryId: number, colorwayId: number, sizeId: number) => {
        return errors.find((item: any) => {
            return item.country === countryId && item.colorway === colorwayId && item.size === sizeId;
        })?.errors?.['cad_quantity'];
    }

    const handleLoadExitingMaterial = (materialData: any) => {
        loadExitingMaterial(materialData)
    }

    const handleOnChangeSizeGroupQuantity = (event: any, countryId: any, colorwayId: any, sizeGroupId: any) => {
        const { name, value } = event.target;
        const actualValue = parseFloat(value) ? parseFloat(value) : 0
        setGeneraPODetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            const country = updatedDetails.quantities.find((c: any) => c.id === countryId);
            if (country) {
                const colorway = country.colorways.find((cw: any) => cw.id === colorwayId);
                if (colorway) {
                    const sizeGroup = colorway.size_groups.find((sg: any) => sg.id === sizeGroupId);
                    if (sizeGroup) {
                        sizeGroup.total_quantity = actualValue;
                    }
                }
            }
            return updatedDetails;
        });
        const quantities = {
            country_id: countryId,
            colorway_id: colorwayId,
            size_group_id: sizeGroupId,
            quantity: actualValue
        };
            api.post(generalPORatioQuantityDeailsURL(versionId), quantities).then(resp => {
                setGeneraPODetails((prevDetails: any) => {
                    const updatedDetails = { ...prevDetails };
                    const country = updatedDetails.quantities.find((c: any) => c.id === countryId);
                    if (country) {
                        const colorway = country.colorways.find((cw: any) => cw.id === colorwayId);
                        if (colorway) {
                            const sizeGroup = colorway.size_groups.find((sg: any) => sg.id === sizeGroupId);
                            if (sizeGroup) {
                                resp.data.size_groups?.sizes?.forEach((newSize: any) => {
                                    const size = sizeGroup.sizes.find((s: any) => s.id === newSize.id);
                                    if (size) {

                                        size.quantity = newSize.quantity;
                                    }
                                });
                            }
                        }
                    }
                    return updatedDetails;
                });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsSaving(false);
            });
    }
    const getColorByIndex = (index: number) => {
        return LightColorsHelper[index % LightColorsHelper.length];
    };

    const getColorwayRows = (country: any) => {
        return (
            country?.colorways.map((colorway: any, index: any) => (
                <React.Fragment  key={`${keyHelper.getNextKeyValue()}`}>
                    <TableRow  key={`${keyHelper.getNextKeyValue()}`}>
                        {index === 0 ?
                            <TableCell
                                sx={{
                                    border: (theme) => `2px solid ${theme.palette.grey[200]}`,
                                    fontWeight: 'bold',
                                    background: (theme) => darken(theme.palette.grey[50], 0.01),
                                    minWidth: '10rem'
                                }}
                            >{country.country_name}</TableCell> : <TableCell />}
                        <TableCell
                            sx={{
                                fontWeight: 'bold',
                                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                background: (theme) => theme.palette.grey[50],
                                minWidth: '10rem'
                            }}
                        >{colorway.colorway}</TableCell>
                        {colorway?.size_groups.map((sizeGroup: any, sizeGroupInex: number) => (
                            sizeGroup.sizes?.map((size: any, i: any) => (
                                <TableCell
                                    key={`${keyHelper.getNextKeyValue()}`}
                                    align='center'
                                    sx={{
                                        borderTop: (theme) => `${index === 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                        minWidth: '7rem'
                                    }}
                                >
                                    <RitzInput
                                        name={getCWQuantiMatrixInputName(country.id, colorway.id, size.id)}
                                        id={"style_description"}
                                        selectedValue={size.quantity}
                                        isMulti={false}
                                        isRequired={true}
                                        isReadOnly={true}
                                    />
                                    {getErrors(country.id, colorway.id, size.id) && <FormErrorMessage message={getErrors(country.id, colorway.id, size.id)} />}
                                </TableCell>
                            ))
                        ))}
                    </TableRow>
                    <TableRow
                        key={`${keyHelper.getNextKeyValue()}`}
                        sx={{
                            '&:last-child td, &:last-child th': {
                                borderBottom: 0
                            }
                        }}
                    >
                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }} color='primary'>Enter the Size Group Quantity :</Typography>
                        </TableCell>
                        {colorway?.size_groups.map((sizeGroup: any, sizeGroupInex: number) => (
                            <TableCell
                                key={`${keyHelper.getNextKeyValue()}`}
                                align='center'
                                colSpan={sizeGroup?.sizes.length}
                                sx={{
                                    background: (theme) => darken(theme.palette.grey[50], 0.01),
                                    border: (theme) => `1px solid ${theme.palette.grey[200]}`
                                }}
                            >
                                <RitzInput
                                    id={"style_description"}
                                    selectedValue={sizeGroup?.total_quantity}
                                    handleOnChange={(event: any) => handleOnChangeSizeGroupQuantity(event, country.id, colorway.id, sizeGroup.id)}
                                    isMulti={false}
                                    isRequired={true}
                                />
                            </TableCell>
                        ))}
                    </TableRow>
                </React.Fragment>
            ))
        );
    };

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    return (
        isLoading ? <DefaultLoader /> :
            <CostingFormLayout step={7} showNavigation={false}>
                <Card id="quantities-holder" variant='outlined'>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell rowSpan={2} colSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center' }}>Description</TableCell>
                                    <TableCell colSpan={generaPODetails?.size_groups?.reduce((acc: number, sizeGroup: any) => acc + sizeGroup.sizes.length, 0)} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', background: (theme) => darken(theme.palette.grey[50], 0.01), }}  >Size Breakdown</TableCell>
                                </TableRow>
                                <TableRow>
                                    {generaPODetails?.size_groups?.map((sizeGroup: any, sizeGroupIndex: number) => (
                                        sizeGroup.sizes?.map((size: any, sizeIndex: any) => (
                                            <TableCell
                                                key={`${keyHelper.getNextKeyValue()}`}
                                                align='center'
                                                sx={{
                                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                    background: getColorByIndex(sizeGroupIndex),
                                                }}
                                            >
                                                {size.name}
                                            </TableCell>
                                        ))

                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody sx={{
                                [`& .${tableCellClasses.root}`]: {
                                    borderBottom: 'none'
                                }
                            }}>
                                {generaPODetails?.quantities?.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))?.map((country: any, index: number) => (
                                    getColorwayRows(country)
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
                {generalPOId ? (
                    <>
                        <Button sx={{ float: 'right', mt: 4 }} variant='contained' disabled={isSaving} onClick={() => updateCWQuantityMatrix(generalPOId)}>{isSaving && <SaveSpinner />}Update</Button>
                        {modalType == 'discrepancy_reasons' && (
                            <Button sx={{ float: 'right', mt: 4, mr: 1 }} variant='contained' disabled={isSaving} onClick={() => handleLoadExitingMaterial(exitingMaterialData)}>Previous</Button>
                        )}

                    </>

                ) : (
                    <Button sx={{ float: 'right', mt: 4 }} variant='contained' disabled={isSaving} onClick={saveCWQuantityMatrix}>{isSaving && <SaveSpinner />}Save</Button>
                )}


            </CostingFormLayout>
    )
}

export default GeneralPurchaseOrder;

