import { setCostingReducerData } from '@/states/costing/CostingActions';
import { useRouter } from 'next/router';
import React, {useEffect, useRef, useState} from 'react';
import { useDispatch } from 'react-redux';
import RitzRadio from "@/components/Ritz/RitzRadio";
import RitzSelectInput from "@/components/Ritz/RitzNumberInput/RitzSelectInput";
import CostingFormLayout from '@/components/OrderInquiry/Costing/CostingForm';
import CostingCard from '@/components/OrderInquiry/Costing/CostingCard';
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import * as yup from "yup";
import { costingOrderColorwaysURL, costingOrderSizesURL } from "@/helpers/constants/FrontEndUrls";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from '@/components/DefaultLoader';
import {createOrUpdateOrderItemsURL} from "@/helpers/constants/RestUrls";
import { getDefaultError } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';


const OrderItemInformation = ({ orderId }: any) => {
    const multiSelectValue = 'multi';
    const singleSelectValue = 'single';
    const packTypeFieldName = 'pack_type';
    const quantityPerPackFieldName = 'quantity_per_pack';
    const orderItemsFieldName = 'items'
    const orderFieldName = 'order';
    const formFields = [multiSelectValue, packTypeFieldName];

    const router = useRouter();
    const dispatch = useDispatch();

    const [packTypes, setPackTypes] = useState([]);
    const [itemOptions, setItemOptions] = useState<any>([]);
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [numItems, setItems] = useState([]);
    const [formErrors, setFormErrors] = useState({hasErrors: false});

    const nextButtonClicked = useRef(false);
    const previousButtonClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        runValidations();
    }, [orderInquiry]);

    // On change of pack type information
    const handleOnChangePackInformation = (event: any) => {
        const {name, value} = event.target;

        if (formFields.indexOf(name) >= 0) {
            const newData = {...orderInquiry, [name]: value};
            if (name == packTypeFieldName && value != multiSelectValue) {
                newData[quantityPerPackFieldName] = 1;
            }
            setOrderInquiry(newData);
        }
    }

    const handleOnChangePackItem = (event: any, dataRow: any, index: number, numInputs: number) => {
        dataRow[quantityPerPackFieldName] = numInputs;
        dataRow[orderFieldName] = orderId;

        const newItems = [...orderInquiry['items']];

        const name = itemOptions.find((i: any) => i.id === dataRow.item)?.name;
        // if (dataRow.id) {
            // Update
            dataRow.name = name;
            newItems[index] = dataRow;
        // } else {
            // Create
            // newItems.push({
            //     name: name,
            //     id: null,
            //     item: dataRow.item
            // });
        // }

        setOrderInquiry({
            ...orderInquiry,
            items: newItems
        });
    }

    const handleOnDeletePackItem = (event: any, dataRow: any, index: number) => {
        const newItems = [...orderInquiry['items']];
        newItems.splice(index, 1);

        setOrderInquiry({
            ...orderInquiry,
            items: newItems
        });
    }

    const runValidations = () => {
        if (formErrors.hasErrors) {
            validateOrderItems();
        }
    }

    const validateOrderItems = (save?: boolean) => {
        if (save) {
            setIsSaving(true);
        }

        const itemsSchema = yup.object({
            [packTypeFieldName]: yup.string().required("Pack Type is Required").typeError("Select a Pack Type"),
            [quantityPerPackFieldName]: yup.number().required("Number of Items is required").typeError('Number of Items in Pack should be a Number'),
            [orderItemsFieldName]: yup.array().test(
                "order-items-validation",
                "Order Items doesn't match entered Number of Items in Pack",
                (value, context) => {
                    // Items equal quantity per pack. Pack type is not multi and

                    if (value.length != orderInquiry?.[quantityPerPackFieldName]) {
                        return false;
                    } else if (orderInquiry?.[packTypeFieldName] == singleSelectValue && orderInquiry?.[quantityPerPackFieldName] != 1) {
                        return context.createError({message: "Number of Items in Pack should be 1"});
                    } else if (orderInquiry?.[quantityPerPackFieldName] <= 1  && orderInquiry?.[packTypeFieldName] == multiSelectValue) {
                        return context.createError({message: "Number of Items in Pack should be greater than 1"});
                    } else {
                        return true;
                    }
            })
        });

        let itemFormErrors = {hasErrors: false}
        itemsSchema.validate({
            [packTypeFieldName]: orderInquiry?.pack_type,
            [quantityPerPackFieldName]: orderInquiry?.quantity_per_pack,
            [orderItemsFieldName]: orderInquiry?.items,
        },  {abortEarly: false}).catch((err) => {

            itemFormErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
                if (!itemFormErrors.hasErrors) {
                    setFormErrors({...itemFormErrors, hasErrors: false})

                    if (save) {
                        const payload: any = {
                            pack_type: orderInquiry?.[packTypeFieldName],
                            quantity_per_pack: orderInquiry?.pack_type == multiSelectValue ? orderInquiry['items'].length : 1,
                            items: [],
                        }

                        const items: any[] = [];
                        orderInquiry['items'].map((i: any) => {
                            items.push({
                                id: i.id,
                                item_id: i.item
                            });
                        });
                        payload['items'] = items;

                        api.post(restUrls.createOrUpdateOrderItemsURL(orderId), payload).then(resp => {
                            const updated = resp?.data?.items || [];

                            // Update local state
                            setOrderInquiry({
                                ...orderInquiry,
                                items: updated
                            });

                            if (nextButtonClicked.current) {
                                router.push(costingOrderColorwaysURL(orderId));
                            } else if (previousButtonClicked.current) {
                                router.push(costingOrderSizesURL(orderId));
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
                } else {
                    setIsSaving(false);
                    nextButtonClicked.current = false;
                    previousButtonClicked.current = false;
                    setFormErrors({...itemFormErrors});
                }
            }
        );
    }

    const handleOnChangeNumInput = (event: any, value: any) => {
        setOrderInquiry({
            ...orderInquiry,
            [quantityPerPackFieldName]: value
        });
    }

    const handleNextButton = () => {
        nextButtonClicked.current = true;
        validateOrderItems(true);
    }

    const handlePreviousButton = () => {
        previousButtonClicked.current = true;
        validateOrderItems(true);
    }

    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL()),
            // api.get(restUrls.itemsURL()),
            api.get(restUrls.fetchOrderItemsURL(orderId))
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata, orderItems] = respData;

            setOrderInquiry(orderInquiry);

            // setItemOptions(items);
            setPackTypes(metadata?.pack_types);
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

    const fetchItemData = () => {
        const brandId = {
            brand_id : orderInquiry.brand ? orderInquiry.brand : null
        }
        const requests = [
            api.post(restUrls.getGeneralInfoCustomerBrandFilteredMetaDataURL(orderInquiry.customer), brandId)
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data); 
            const [MetaData] = respData;
            setItemOptions(MetaData.items);
        })
    }

    useEffect(() => {
        if (orderId) {
            fetchData();
            if (orderInquiry.brand > 0 && orderInquiry.customer > 0) {
                fetchItemData()
            }
        }
    }, [orderId, orderInquiry.brand, orderInquiry.customer]);

    return (
        <>{isLoading ? <DefaultLoader /> : 
            <CostingFormLayout step={3} formValues={orderInquiry}>
                <CostingCard>
                    <RitzRadio
                        options={packTypes}
                        name={packTypeFieldName}
                        id={"packtype"}
                        isMulti={false}
                        selectedValue={orderInquiry?.[packTypeFieldName]}
                        isRequired={true}
                        labelText={"Select Pack Type:"}
                        handleOnChange={handleOnChangePackInformation}
                        optionValue={ 'id' }
                        optionText={ 'name' }
                    />
                    <RitzFormErrors errorList={formErrors?.[packTypeFieldName]}/>
                </CostingCard>
                { orderInquiry?.pack_type &&
                    <CostingCard>
                        <RitzSelectInput
                            selectOptions={itemOptions}
                            selectOptionValueField='id'
                            selectOptionDisplayValueField='name'
                            selectedValue={orderInquiry?.[quantityPerPackFieldName]}
                            labelText={'Items in Pack'}
                            headerText={'Select Items'}
                            currentData={
                                {
                                    selectedNumInputs: orderInquiry?.[quantityPerPackFieldName],
                                    currentData: orderInquiry?.[orderItemsFieldName]
                                }
                            }
                            currentDataValueField={'item'}
                            handleCreateUpdate={handleOnChangePackItem}
                            handleOnDelete={handleOnDeletePackItem}
                            handleOnChangeNumInput={handleOnChangeNumInput}
                            showNumInputs={(orderInquiry?.pack_type && orderInquiry?.pack_type == multiSelectValue)}
                        />
                        <RitzFormErrors errorList={formErrors?.[quantityPerPackFieldName]}/>
                        <RitzFormErrors errorList={formErrors?.[orderItemsFieldName]}/>
                    </CostingCard>
                }

                <CostingActionButtons
                    showSave={true}
                    saveButtonOnClickAction={() => validateOrderItems(true)}
                    showNext={true}
                    nextButtonOnClickAction={handleNextButton}
                    showPrevious={true}
                    previousButtonOnClickAction={handlePreviousButton}
                    errors={formErrors}
                    saving={isSaving}
                />
            </CostingFormLayout>
        }</>
    );
};

export default OrderItemInformation;