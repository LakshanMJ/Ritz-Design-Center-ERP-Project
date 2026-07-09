import { setCostingReducerData } from '@/states/costing/CostingActions';
import CostingFormLayout from '@/components/OrderInquiry/Costing/CostingForm';
import { Card, MenuItem, Select, Table, TableHead, TableContainer, TableCell, TableRow, TableBody, FormControl, InputLabel } from '@mui/material';
import { useRouter } from 'next/router';
import React, {useEffect, useRef, useState} from 'react';
import  { useDispatch } from 'react-redux';
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import {
    orderColorwaysURL,
    orderCountryColorwaySizeQuantityURL, orderItemVariationMatrixURL, orderSummaryURL
} from "@/helpers/constants/FrontEndUrls";
import * as yup from 'yup';
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from '@/components/DefaultLoader';
import { getDefaultError } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';


const OrderItemColorway = ({ orderId } : any) => {
    const cwCategoryTypeField = 'cw_category_type';

    const router = useRouter();
    const dispatch = useDispatch();

    const nextButtonClicked = useRef(false);
    const previousButtonClicked = useRef(false);

    // Local states
    const [orderColorways, setOrderColorways] = useState<any>([]);
    const [orderItems, setOrderItems] = useState<any>([]);
    const [orderItemColorwayTypes, setOrderItemColorwayTypes] = useState<any[]>([]);
    const [orderColorwayCategories, setOrderColorwayCategories] = useState<any>([]);
    const [formErrors, setFormErrors] = useState<any>({hasErrors: false});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);


    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL()),
            api.get(restUrls.orderColorwayDetailsURL(orderId)),

        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata, orderCwDetails] = respData;

            setOrderColorways(orderCwDetails['colorways']);
            setOrderItems(orderInquiry['items']);
            setOrderItemColorwayTypes(orderInquiry['colorway_item_types']);//change this (colorway_category)
            setOrderColorwayCategories(metadata['colorway_categories']);

            // Set in CostingReducer
            dispatch(setCostingReducerData({
                metadata: metadata,
                order_inquiry: {
                    ...orderInquiry,
                    size_groups: orderSizeGroups
                }
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (formErrors.hasErrors) {
            validateColorwayTypesAndSave(false);
        }
    }, [orderItemColorwayTypes]);

    const updateItemColorwayType = (e: any, item: any, colorway: any) => {
        const { value, name } = e.target;
        const orderItemColorwayTypeCopy = [...orderItemColorwayTypes];
        setOrderItemColorwayTypes(orderItemColorwayTypeCopy);
        const matchingItemColorwayType = orderItemColorwayTypeCopy.find((itemCWCategory: any) => itemCWCategory.item == item.id && itemCWCategory.colorway == colorway.id);
        if (matchingItemColorwayType) {
            matchingItemColorwayType.colorway_category = value;
        } else {
            orderItemColorwayTypeCopy.push({ item: item.id, colorway: colorway.id, colorway_category: value });
        }
        setOrderItemColorwayTypes(orderItemColorwayTypeCopy);
    }

    const validateColorwayTypesAndSave = (save=true) => {
        if (save) {
            setIsSaving(true);
        }

        const orderColorwayCategoryTypesSchema = yup.object({
            [cwCategoryTypeField]: yup.array().test(
                'colorway_category_type_validation',
                '',
                (value, context) => {
                    let numPossibleOptions = orderItems.length * orderColorways.length;

                    if (numPossibleOptions != value.length) {
                        return context.createError({message: "Select a Colorway Type for every Colorway, Item Combination"});
                    }

                    // validate ids
                    value.forEach((cwCatType: any) => {
                        if (orderColorwayCategories.filter((oCWCatType: any) => cwCatType.colorway_type == oCWCatType.id).length == 0) {
                            return context.createError({message: "Enter valid data"});
                        }
                    });
                    return true;
                }
            )}
        );

        let cwCategoryFormErrors = {hasErrors: false};

        orderColorwayCategoryTypesSchema.validate({
            [cwCategoryTypeField]: orderItemColorwayTypes
        },  {abortEarly: false}).catch((err) => {

            cwCategoryFormErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!cwCategoryFormErrors.hasErrors) {
                setFormErrors({...cwCategoryFormErrors, hasErrors: false});
                if (save) {
                    saveItemColorwayTypes();
                } else {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
                nextButtonClicked.current = false;
                previousButtonClicked.current = false;
                setFormErrors({...cwCategoryFormErrors});
            }
        });
    }

    const saveItemColorwayTypes = () => {
        api.post(restUrls.costingOrderColorwayItemTypesURL(orderId), orderItemColorwayTypes).then(resp => {
            if (nextButtonClicked.current) {
                router.push(orderSummaryURL(orderId));
            } else if (previousButtonClicked.current) {
                router.push(orderColorwaysURL(orderId));
            }
        }).catch(error => {
            // TODO ERROR
            // if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
            //     setErrors(error.response.data);
            // }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleNextButton = () => {
        nextButtonClicked.current = true;
        validateColorwayTypesAndSave();
    }

    const handlePreviousButton = () => {
        previousButtonClicked.current = true;
        validateColorwayTypesAndSave();
    }


    return (
        <>{isLoading ? <DefaultLoader/> : 
            <CostingFormLayout step={5} >
                <Card id={'colorway-category-holder'} sx={{ mb: 4 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    {orderColorways.map((colorway: any, index: any) => (
                                        <TableCell 
                                            key={index} 
                                            align='center' 
                                            sx={{
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`
                                            }}
                                        >
                                            {colorway.colorway}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orderItems.map((item: any, index: number) => (
                                    <TableRow 
                                        key={item.id} 
                                        sx={{
                                            '&:nth-of-type(odd)': {
                                                backgroundColor: (theme) => theme.palette.grey[50],
                                            },
                                            '&:last-child td, &:last-child th': {
                                                borderBottom: 0
                                            }
                                        }}
                                    >
                                        <TableCell>{item.name} [ {item.item_identifier} ]</TableCell>

                                        {orderColorways.map((colorway: any, index: number) => (
                                            <TableCell
                                                key={`${colorway.id}_${item.id}`}
                                                // align='center'
                                                sx={{
                                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,  textAlign: 'center',   width: "auto",
                                                }}
                                            >
                                                <FormControl  >
                                                    {!orderItemColorwayTypes?.find((itemCWType) => itemCWType?.item == item?.id && itemCWType?.colorway == colorway.id)?.colorway_category && <InputLabel id={'sel-' + index} shrink={false}>Select...</InputLabel>}
                                                    <Select
                                                        labelId={'sel-' + index}
                                                        required
                                                        onChange={(e) => updateItemColorwayType(e, item, colorway)}
                                                        name={`${item.id}_${colorway.id}`}
                                                        value={orderItemColorwayTypes?.find((itemCWCategory) => itemCWCategory?.item == item?.id && itemCWCategory?.colorway == colorway.id)?.colorway_category || ''}
                                                        style={{ width: '200px' }}
                                                    >
                                                        {orderColorwayCategories?.map((colorway_category: any, category_index: any) => (
                                                            <MenuItem key={category_index} value={colorway_category.id}>{colorway_category.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <RitzFormErrors errorList={formErrors?.[cwCategoryTypeField]}/>
                </Card>
                <CostingActionButtons
                    showNext={true}
                    nextButtonOnClickAction={handleNextButton}
                    showSave={true}
                    saveButtonOnClickAction={validateColorwayTypesAndSave}
                    showPrevious={true}
                    previousButtonOnClickAction={handlePreviousButton}
                    errors={formErrors}
                    saving={isSaving}
                />
            </CostingFormLayout>
        }</>
    )
};

export default OrderItemColorway;