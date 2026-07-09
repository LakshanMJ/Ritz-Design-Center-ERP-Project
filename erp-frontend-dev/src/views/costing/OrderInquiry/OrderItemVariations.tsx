import CostingFormLayout from '@/components/OrderInquiry/Costing/CostingForm';
import { Card, MenuItem, Select, Table, TableHead, TableContainer, TableCell, TableRow, TableBody, FormControl, InputLabel } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import {
    orderColorwayMatrixURL, orderSummaryURL
} from "@/helpers/constants/FrontEndUrls";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from '@/components/DefaultLoader';
import { getDefaultError } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';
import * as yup from 'yup';


const OrderItemVariation = ({ orderId }: any) => {
    const itemVariationTypeField = 'cw_category_type';

    const router = useRouter();
    const dispatch = useDispatch();
    const nextButtonClicked = useRef(false);
    const previousButtonClicked = useRef(false);
    // Local states
    const [orderColorways, setOrderColorways] = useState<any>([]);
    const [orderItems, setOrderItems] = useState<any>([]);
    const [variations, setVariations] = useState<any>([]);
    const [formErrors, setFormErrors] = useState<any>({ hasErrors: false });
    const [variationMatrix, setVariationMatrix] = useState<any>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
console.log(variationMatrix,"variationMatrix")
    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);
    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderColorwayDetailsURL(orderId)),
            api.get(restUrls.createItemVariationURL()),//get all variations
            api.get(restUrls.costingOrderItemVariationURL(orderId)),//get variation matrix data
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderCwDetails, variations,orderItemVariationDetails] = respData;
            setOrderColorways(orderCwDetails['colorways']);
            setOrderItems(orderInquiry['items']);
            setVariations([...variations])
            setVariationMatrix([...orderItemVariationDetails])
            // Set in CostingReducer
        }).catch(error => {
             toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const updateItemColorwayType = (e: any, item: any, colorway: any) => {
        const selectedVariationId = e.target.value;
        const orderColorwayId = colorway.id;
        const orderItemId = item.id;
        const existingIndex = variationMatrix.findIndex(
            (variationData: any) =>
                variationData.order_colorway_id === orderColorwayId && variationData.order_item_id === orderItemId
        );
        const variationData = {
            order_colorway_id: orderColorwayId,
            order_item_id: orderItemId,
            item_variation_id: selectedVariationId,
        };
        if (existingIndex !== -1) {
            const updatedMatrix = [...variationMatrix];
            updatedMatrix[existingIndex] = variationData;
            setVariationMatrix(updatedMatrix);
        } else {
            setVariationMatrix((prevMatrix: any) => [...prevMatrix, variationData]);
        }
    };
    const validateItemVariationAndSave = (save=true) => {
        if (save) {
            setIsSaving(true);
        }

        const orderItemVariationSchema = yup.object({
            [itemVariationTypeField]: yup.array().test(
                'colorway_category_type_validation',
                '',
                (value, context) => {
                    let numPossibleOptions = orderItems.length * orderColorways.length;
                    if (numPossibleOptions != value.length) {
                        return context.createError({message: "Select a Item Variation for every Colorway, Item Combination"});
                    }
                    return true;
                }
            )}
        );

        let itemVariationFormErrors = {hasErrors: false};

        orderItemVariationSchema.validate({
            [itemVariationTypeField]: variationMatrix
        },  {abortEarly: false}).catch((err) => {

            itemVariationFormErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
          
            if (!itemVariationFormErrors.hasErrors) {
                
                setFormErrors({...itemVariationFormErrors, hasErrors: false});
                if (save) {
                    saveItemVariations()
                } else {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
                nextButtonClicked.current = false;
                previousButtonClicked.current = false;
                setFormErrors({...itemVariationFormErrors});
            }
        });
    }
    const saveItemVariations = () => {
        const request = {
            method:'post',
            url: restUrls.costingOrderItemVariationURL(orderId),
            data: variationMatrix
          }
          api(request).then(() => {
            if (nextButtonClicked.current) {
                router.push(orderSummaryURL(orderId));
            } else if (previousButtonClicked.current) {
                router.push(orderColorwayMatrixURL(orderId));
            }
          }).catch(error => {
            const errorMsg = error.response.data;
            setFormErrors({ ...errorMsg.errors });
            toast.error(getDefaultError(error?.response?.status));
          }).finally(() => {
            setIsSaving(false);
          });
        };

        const handleNextButton = () => {
            nextButtonClicked.current = true;
            validateItemVariationAndSave();
        }
    
        const handlePreviousButton = () => {
            previousButtonClicked.current = true;
            validateItemVariationAndSave();
        }
  

    return (
        <>{isLoading ? <DefaultLoader /> :
            <CostingFormLayout step={7} >
                <Card id={'colorway-category-holder'} sx={{ mb: 4 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    {orderItems.map((item: any, index: number) => (
                                        <TableCell
                                            key={index}
                                            align='center'
                                            sx={{
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`
                                            }}
                                        >
                                            {item.name}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orderColorways.map((colorway: any, index: number) => (
                                    <TableRow
                                        key={colorway.id}
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: (theme) => theme.palette.grey[50],
                                            },
                                            '&:last-child td, &:last-child th': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>{colorway.colorway}</TableCell>
                                        {orderItems.map((item: any, index: number) => {
                                            const itemWiseVariations = variations?.filter((variation: any) => variation?.item === item?.item) || [];
                                            const variationData = variationMatrix.find((data: any) => data.order_colorway_id === colorway.id && data.order_item_id === item.id);
                                            const selectedVariation = variationData ? variationData.item_variation_id : '';

                                            return (
                                                <TableCell
                                                    key={`${item.id}_${colorway.id}`}
                                                    sx={{
                                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                    }}
                                                >
                                                    <FormControl fullWidth>
                                                        {selectedVariation === '' && (
                                                            <InputLabel id={'sel-' + index} shrink={false}>Select...</InputLabel>
                                                        )}
                                                        <Select
                                                            labelId={'sel-' + index}
                                                            required
                                                            onChange={(e) => updateItemColorwayType(e, item, colorway)}
                                                            name={`${item.id}_${colorway.id}`}
                                                            value={selectedVariation}
                                                        >
                                                            {itemWiseVariations.map((variation: any, type_index: any) => (
                                                                <MenuItem key={type_index} value={variation.id}>{variation.variation_name}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <RitzFormErrors errorList={formErrors?.[itemVariationTypeField]}/>
                </Card>
                <CostingActionButtons
                    showNext={true}
                    nextButtonOnClickAction={handleNextButton}
                    showSave={true}
                    saveButtonOnClickAction={validateItemVariationAndSave}
                    showPrevious={true}
                    previousButtonOnClickAction={handlePreviousButton}
                    errors={formErrors}
                    saving={isSaving}
                />
            </CostingFormLayout>
        }</>
    )
};

export default OrderItemVariation;