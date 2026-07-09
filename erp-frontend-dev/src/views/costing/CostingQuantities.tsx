import React, {useEffect, useState} from "react";
import Table from "@mui/material/Table";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import RitzInput from "@/components/Ritz/RitzInput";
import {
    apifyUIStateCWEstimateQuantityMatrixList,
    apifyUIStateCWQuantityMatrixList,
    getCWQuantiMatrixEstimateQty,
    getCWQuantiMatrixInputName,
    processEstimateQuantityMatrixAPIResponse,
    processQuantityMatrixAPIResponse
} from "@/helpers/costings/QuantityMatrix";
import DefaultLoader from "@/components/DefaultLoader";
import CostingFormLayout from "../../components/OrderInquiry/Costing/CostingForm";
import { lightBlue } from "@mui/material/colors";
import { Card, alpha, darken, Box, Button } from "@mui/material";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import FormErrorMessage from "@/components/FormErrorMessage";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import SaveSpinner from "@/components/SaveSpinner";
import { debug } from "console";


const CostingQuantities = ( {orderId, versionId, readOnly=false, showNavigation=false, highlightColorwayTypeDetails=null, closeModal}: any ) => {
    const colorwayItemTypesKey = 'colorway_item_types';
    const [cwQuantities, setCwQuantities] = useState({});
    const [cwEstimateQty, setCwEstimateQty] = useState({});
    const [cwCadQty, setCwCadQty] = useState({});
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCells, setSelectedCells] = useState([]);
    const [errors, setErrors] = useState([]);

    const fetchData = () => {
        Promise.all([
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderPackQuantitiesURL(orderId, versionId)),
            api.get(restUrls.orderPackEstimatedQuantitiesURL( versionId))
        ]).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, quantitiesData, estimateQtyData] = respData;
            setOrderInquiry(orderInquiry);

            const quantities = processQuantityMatrixAPIResponse(quantitiesData);
            const estimateQuantities = processEstimateQuantityMatrixAPIResponse(estimateQtyData);

            setCwQuantities(quantities);
            setCwEstimateQty(estimateQuantities)

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    // When a quantity changes update state
    const handleOnChangeCWEstimateQty = (event: any, countryId: any, colorwayId: any) => {
        const { name, value } = event.target;
        setCwEstimateQty({ ...cwEstimateQty, ...{ [name]: value } })

    }
    const handleOnChangeCWQuantityMatrix = (event: any) => {
        const { name, value } = event.target;
        setCwQuantities({ ...cwQuantities, ...{ [name]: value } })
       
       
    }

    const groupByCountryAndColorway = (ratios:any) => {
        const groupedQuantities = {};
      
        for (const key in ratios) {
          const [country, colorway] = key.split('_').slice(0, 2);
          const prefix = `${country}_${colorway}`;
      
          if (!groupedQuantities[prefix]) {
            groupedQuantities[prefix] = 0;
          }
      
          if (ratios[key] !== null) {
            groupedQuantities[prefix] += parseInt(ratios[key], 10);
          }
        }
      
        return groupedQuantities;
      };

    const saveCWQuantityMatrix = () => {
        setIsSaving(true);
        setErrors([]);

        const ratioQty = apifyUIStateCWQuantityMatrixList(cwQuantities);
        const estimateQty= apifyUIStateCWEstimateQuantityMatrixList(cwEstimateQty);
        const dataList = {
            colorway_country_quantity: estimateQty,
            ratios: ratioQty
          };

        api.post(restUrls.orderPackQuantitiesURL(orderId, versionId), dataList).then(resp => {
           toast.success(DEFAULT_SUCCESS);
           closeModal();
        }).catch(error => {
            if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                setErrors(error.response.data);
            }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleOnFocusCell = (props: any) => {
        let selCells: Array<string> = [];
        selCells.push(props?.cellId);
        orderInquiry?.items?.forEach((item: any) => {
            const cellId = `${props?.colorwayId}_${props?.sizeId}_${item.id}_itemchild_${props?.countryId}`;
            selCells.push(cellId);
        });
        setSelectedCells(selCells);
    }

    const getColorwayItemCategory = (itemId: number, colorwayId: number) => {
        const cwColorwayItemTypes = orderInquiry?.[colorwayItemTypesKey];

        return cwColorwayItemTypes.find((item: any, index: number) => {
            return item.item == itemId && item.colorway == colorwayId;
        });

    }

    const getErrors = (countryId: number, colorwayId: number, sizeId: number) => {
        return errors.find((item: any) => {
            return item.country === countryId && item.colorway === colorwayId && item.size === sizeId;
        })?.errors?.['cad_quantity'];
    }

    const getColorwayTypeDisplay = (item: any, itemId: number, colorwayId: number) => {

        const cwItemCategory = getColorwayItemCategory(itemId, colorwayId);
        const sameItemAsHighlightColorwayTypeDetails = (highlightColorwayTypeDetails && cwItemCategory?.meta_item_id == highlightColorwayTypeDetails?.meta_item_id) &&
            (highlightColorwayTypeDetails && cwItemCategory.colorway_type == highlightColorwayTypeDetails.colorway_type);
        return (
            <>
                { sameItemAsHighlightColorwayTypeDetails ? (
                        <Box sx={{ color: 'success.main', fontWeight: 'bold'}}>{item.name}({cwItemCategory?.['colorway_type_display'] || 'N/A'})</Box>
                    ): (
                        <Box>{item.name} ({cwItemCategory?.['colorway_type_display'] || 'N/A'})</Box>
                    )
                }
            </>
        )
    }

    // Build rows for each colorway
    const getColorwayRows = (country: any) => {
        return (
            orderInquiry?.colorways.map((colorway: any, index: any) => (
                <React.Fragment key={colorway.id + '_colorway_parent_' + country.id}>
                    <TableRow
                        key={colorway.id + '_colorway_inputs_' + country.id}
                    >
                        {index == 0 ? 
                            <TableCell
                                sx={{
                                    borderTop: (theme) => `2px solid ${theme.palette.grey[200]}`,
                                    borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                    fontWeight: 'bold',
                                    background: (theme) => darken(theme.palette.grey[50], 0.01),
                                    minWidth: '10rem'
                                }}
                            >{country.name}</TableCell> : <TableCell />}
                        <TableCell
                            sx={{
                                fontWeight: 'bold',
                                borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                background: (theme) => theme.palette.grey[50],
                                minWidth: '10rem'
                            }}
                        >{colorway.colorway}</TableCell>
                        <TableCell
                            align='center'
                            sx={{
                                fontWeight: 'bold',
                                borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                background: (theme) => theme.palette.grey[50],
                                minWidth: '10rem'
                            }}
                        > 
                         <RitzInput
                                    name={getCWQuantiMatrixEstimateQty(country.id, colorway.id)}
                                    id={"estimate_qty"}
                                    selectedValue={cwEstimateQty?.[getCWQuantiMatrixEstimateQty(country.id, colorway.id)]}
                                    isMulti={false}
                                    isRequired={true}
                                    handleOnChange={(event:any) => handleOnChangeCWEstimateQty(event, country.id, colorway.id)}
                                    handleOnBlur={() => setSelectedCells([])}
                                    isReadOnly={readOnly}
                                />
                        </TableCell>
                        {orderInquiry?.sizes.map((size: any, i: number) => (
                            <TableCell
                                key={colorway.id + "_" + size.id + "_colorwaysize_" + country.id}
                                align='center'
                                sx={{
                                    borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                    background: (theme) => selectedCells.includes(colorway.id + "_" + size.id + "_colorwaysize_" + country.id) ? alpha(lightBlue[50], 0.7) : theme.palette.grey[50],
                                    minWidth: '7rem'
                                }}
                            >
                                <RitzInput
                                    name={getCWQuantiMatrixInputName(country.id, colorway.id, size.id)}
                                    id={"style_description"}
                                    selectedValue={cwQuantities?.[getCWQuantiMatrixInputName(country.id, colorway.id, size.id)]}
                                    isMulti={false}
                                    isRequired={true}
                                    handleOnChange={handleOnChangeCWQuantityMatrix}
                                    handleOnBlur={() => setSelectedCells([])}
                                    handleOnFocus={() => handleOnFocusCell({cellId: colorway.id + "_" + size.id + "_colorwaysize_" + country.id, colorwayId: colorway.id, sizeId: size.id, countryId: country.id})}
                                    isReadOnly={readOnly}
                                />
                                {getErrors(country.id, colorway.id, size.id) && <FormErrorMessage message={getErrors(country.id, colorway.id, size.id)} />}
                            </TableCell>
                        ))}
                    </TableRow>
                    {orderInquiry?.items.map((item: any, index: number) => (
                        <TableRow
                            key={colorway.id + "_" + "_" + item.id + "_itemparent_" + country.id} 
                            sx={{
                                '&:last-child td, &:last-child th': { 
                                    borderBottom: 0
                                }
                            }}
                        >
                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                 {getColorwayTypeDisplay(item, item.id, colorway.id)}
                            </TableCell>
                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                            {orderInquiry?.sizes.map((size: any, index: number) => (
                                
                                <TableCell
                                    key={colorway.id + "_" + size.id + "_" + item.id + "_itemchild_" + country.id}
                                    align='center'
                                    sx={{
                                        background: selectedCells.includes(colorway.id + "_" + size.id + "_" + item.id + "_itemchild_" + country.id) ? alpha(lightBlue[50], 0.5) : 'transparent',
                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`
                                    }}
                                >
                                    <RitzInput
                                        isReadOnly={true}
                                        selectedValue={cwCadQty?.[country.id + "_" + colorway.id + "_" + size.id]}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </React.Fragment>
            ))
        )
    }

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

          

    useEffect(() => {
        const groupedRatioQuantities = groupByCountryAndColorway(cwQuantities);
        const dividedQuantities = {};
        for (const key in groupedRatioQuantities) {
            if (groupedRatioQuantities[key] !== 0) {
                dividedQuantities[key] = cwEstimateQty[key] / groupedRatioQuantities[key];
            } else {
                dividedQuantities[key] = 0;
            }
        }

        const multipliedFinalqty = {};
        for (const key in cwQuantities) {
            const [country, colorway, size] = key.split('_');
            const prefix = `${country}_${colorway}`;

            if (dividedQuantities[prefix] !== 0) {
                const value = cwQuantities[key] !== null ? cwQuantities[key] * dividedQuantities[prefix] : null;
                multipliedFinalqty[key] = value !== null ? Math.round(value) : null;
            } else {
                multipliedFinalqty[key] = null;
            }
        }
        setCwCadQty({ ...multipliedFinalqty })

    }, [cwQuantities, cwEstimateQty]);

    

    return (
        isLoading ? <DefaultLoader /> : 
        <CostingFormLayout step={7} showNavigation={showNavigation}>
            <Card id="quantities-holder" variant='outlined'>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ }}>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Estimate Qty</TableCell>
                                {orderInquiry?.sizes?.map((size: any, index: number) => (
                                    <TableCell key={index} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{size.name}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{
                            [`& .${tableCellClasses.root}`]: {
                                // py: '0.7rem',
                                borderBottom: 'none'
                            }
                        }}>
                            {orderInquiry?.countries?.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))?.map((country: any, index: number) => (
                                getColorwayRows(country)
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
            { !readOnly &&
                <Button sx={{ float: 'right', mt: 4 }} variant='contained' disabled={isSaving} onClick={saveCWQuantityMatrix}>{isSaving && <SaveSpinner/>}Save</Button>
            }
        </CostingFormLayout>
    )
}

export default CostingQuantities;

