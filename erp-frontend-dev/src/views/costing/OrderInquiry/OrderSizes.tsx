import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import RitzRadio from "@/components/Ritz/RitzRadio";
import RitzMultiSelectInput from "@/components/Ritz/RitzNumberInput/RitzMultiSelectInput";
import { useRouter } from "next/router";
import CostingFormLayout from "@/components/OrderInquiry/Costing/CostingForm";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import RitzMultiSelectCheckBox from "@/components/Ritz/RitzMultiSelectCheckBox";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import * as yup from "yup";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import { costingOrderCountriesURL, costingOrderItemsURL } from "@/helpers/constants/FrontEndUrls";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";


const OrderInquirySizes = ({ orderId }: any) => {
    const GROUP_SIZES_PRICING_TYPE = 'group_by_sizes';
    const API_COSTING_METHOD_FIELD = 'costing_method';
    const API_SIZE_CATEGORY_FIELD = 'size_category';
    const API_SIZES_FIELD = 'sizes';
    const API_SIZE_GROUPS_FIELD = 'size_groups';

    const ORDER_SIZE_GROUP_DUPLICATED_ERROR = `The same Size has been added to 2 or more Groups. A size can only be in one group.`;
    const ORDER_SIZE_GROUP_MISSING_SIZE_ERROR = `Order Size Groups doesn't cover all the Sizes entered.`;

    // Metadata
    const [sizes, setSizes] = useState([]); // size category and associated options
    const [costingMethods, setCostingMethods] = useState([]);

    const [orderInquiry, setOrderInquiry] = useState({});
    const [sizeIds, setSizeIds] = useState([]);
    const [groupSizes, setGroupSizes] = useState([]);
    const [formErrors, setFormErrors] = useState({hasErrors: false});

    const nextPageClicked = useRef(false);
    const previousPageClicked = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        if (formErrors.hasErrors) {
            validateOrderSizeForm();
        }
    }, [orderInquiry]);

    // Handle user change of sizeCategory
    const handleOnChangeSizeCategory = (event: any) => {
        const { value } = event.target;

        setSizeIds([]); // reset since it depends on size_category
        setGroupSizes([]);

        setOrderInquiry({
            ...orderInquiry,
            size_category: value,
            sizes: [],  // reset since it depends on size_category
            costing_method: '',
            size_groups: [],
        });
    }

    // Handle user change of Size
    const handleOnChangeSize = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const sizeIds = data.map((size: any) => size.id);
        setSizeIds(sizeIds);

        const sizeGroups = orderInquiry['size_groups'];

        sizeGroups.forEach((grp: any) => {
            const newSizes: any[] = [];
            grp?.order_sizes_details?.forEach((size: any) => {
                if (sizeIds.includes(size.size)) {
                    newSizes.push(size);
                }
            });
            grp.order_sizes_details = newSizes;
        });

        setOrderInquiry({
            ...orderInquiry,
            sizes: data,
            size_groups: sizeGroups
        });
    }

    // Handle change of Pricing Type
    const handleOnChangeSizePricingType = (event: any) => {
        const { value } = event.target;

        setOrderInquiry({
            ...orderInquiry,
            costing_method: value,
            size_groups: [] // reset since it depends on costing method
        });

        setGroupSizes([]);  // reset since it depends on costing method
    }

    // Handle onchange of size groups
    const handleOnChangeSizeGroups = (event: any, index: any, data: any) => {
        console.log(data, "<-----", data?.order_sizes_details?.length)
        if (data?.order_sizes_details?.length > 0) {
            console.log("-------")
            const newGroups = [...groupSizes];
            newGroups[index] = data;
            setGroupSizes(newGroups);

            setOrderInquiry({
                ...orderInquiry,
                size_groups: newGroups
            });
        }
    }

    const handleOnDeleteSizeGroups = (event: any, index: number, data: any) => {
        const newGroups = [...groupSizes];
        newGroups.splice(index, 1);
        setGroupSizes(newGroups);

        setOrderInquiry({
            ...orderInquiry,
            size_groups: newGroups
        });
    }

    /***************** End of Order Size ********************/
    const handleNextButton = () => {
        nextPageClicked.current = true;
        validateOrderSizeForm(true);
    }

    const handlePreviousButton = () => {
        previousPageClicked.current = true;
        validateOrderSizeForm(true);
    }

    const validateOrderSizeForm = (save?: boolean) => {
        if (save) {
            setIsSaving(true);
        }

        const sizesSchema = yup.array().min(1, "Select at least one Size");

        const sizeGroupsSchema = yup.array().test(
            "size-groups-match-sizes",
            "Size Groups entered doesn't match",
            (value, context) => {
                if (orderInquiry['costing_method'] == GROUP_SIZES_PRICING_TYPE) {
                    let errors: string[] = [];
                    const addedSizeIDs: number[] = [];

                    value.map((item: { order_sizes_details: [] }) => {
                        const sizeIds = item.order_sizes_details?.map((i: any) => i.size);
                        if (sizeIds?.length > 0) {
                            sizeIds.map((size: number) => {
                                if (addedSizeIDs.includes(size)) {
                                    if (!errors.includes(ORDER_SIZE_GROUP_DUPLICATED_ERROR)) {
                                        errors.push(ORDER_SIZE_GROUP_DUPLICATED_ERROR);
                                    }
                                } else {
                                    addedSizeIDs.push(size);
                                }
                            });
                        } else {
                            errors.push(ORDER_SIZE_GROUP_MISSING_SIZE_ERROR);
                        }
                    });

                    orderInquiry['sizes'].map((oSize: any) => {
                        if (!addedSizeIDs.includes(oSize.size)) {
                            if (!errors.includes(ORDER_SIZE_GROUP_MISSING_SIZE_ERROR)) {
                                errors.push(ORDER_SIZE_GROUP_MISSING_SIZE_ERROR);
                            }
                        }
                    });

                    return errors.length > 0 ? context.createError({message: errors[0]}): true;

                } else {
                    return true;
                }
            }
        )

        const sizeSchema = yup.object({
            [API_SIZE_CATEGORY_FIELD]: yup.number().required("Size Category is needed").typeError("Select a valid Size Category"),
            [API_COSTING_METHOD_FIELD]: yup.string().required("Costing Method is needed").typeError("Select a valid Costing Method"),
            sizes: sizesSchema,
            size_groups: sizeGroupsSchema
        });

        let formErrors = {hasErrors: false};

        sizeSchema.validate({
            [API_SIZE_CATEGORY_FIELD]: orderInquiry[API_SIZE_CATEGORY_FIELD],
            [API_COSTING_METHOD_FIELD]: orderInquiry[API_COSTING_METHOD_FIELD],
            [API_SIZES_FIELD]: orderInquiry[API_SIZES_FIELD],
            [API_SIZE_GROUPS_FIELD]: orderInquiry['size_groups']
        },  {abortEarly: false}).catch((err) => {
            formErrors = err?.inner?.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!formErrors?.hasErrors) {
                setFormErrors({...formErrors, hasErrors: false});

                if (save) {
                    const payload = {
                        size_category: orderInquiry['size_category'],
                        sizes: sizeIds,
                        costing_method: orderInquiry['costing_method']
                    }
                    if (orderInquiry['costing_method'] === 'group_by_sizes') {
                        const sizeGroupIds = orderInquiry['size_groups']?.map((i: any) => i?.order_sizes_details?.map((s: any) => s?.size)) || [];
                        payload['number_of_groups'] = sizeGroupIds.length;
                        payload['size_groups'] = sizeGroupIds
                    }

                    api.post(restUrls.updateOrderSizes(orderId), payload).then(resp => {
                        if (nextPageClicked.current) {
                            router.push(costingOrderItemsURL(orderId));
                        } else if (previousPageClicked.current) {
                            router.push(costingOrderCountriesURL(orderId));
                        }
                    }).catch(error => {
                        // TODO ERROR
                        // if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                        //     setErrors(error.response.data);
                        // }
                        toast.error(getDefaultError(error?.response?.status));
                    }).finally(() =>  {
                        setIsSaving(false);
                    });
                } else {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
                nextPageClicked.current = false;
                previousPageClicked.current = false;
                setFormErrors({...formErrors});
            }
        });
    }

    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizesURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL())
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizes, orderSizeGroups, metadata] = respData;

            const inquiry = {
                ...orderInquiry,
                size_groups: orderSizeGroups
            }

            setOrderInquiry(inquiry);
            setSizeIds(orderSizes.map((size: any) => size.size));
            setSizes(metadata?.sizes);
            setCostingMethods(metadata?.costing_methods);
            setGroupSizes(orderSizeGroups);

            // Set in CostingReducer
            dispatch(setCostingReducerData({
                metadata: metadata,
                order_inquiry: inquiry
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    return (
        <>{isLoading ? <DefaultLoader/> : 
            <CostingFormLayout step={2} formValues={orderInquiry}>
                <CostingCard>
                    <RitzRadio
                        options={sizes}
                        name={API_SIZE_CATEGORY_FIELD}
                        id={"size_category"}
                        isMulti={false}
                        selectedValue={orderInquiry?.['size_category']}
                        isRequired={true}
                        labelText={"Select Size Category:"}
                        handleOnChange={handleOnChangeSizeCategory}
                        optionValue={'id'}
                        optionText={'name'}
                    ></RitzRadio>
                    <RitzFormErrors errorList={formErrors?.[API_SIZE_CATEGORY_FIELD]}/>
                </CostingCard>

                {orderInquiry?.['size_category'] && sizes?.length > 0 && sizes.map((size: any, i: number) => (
                    <React.Fragment key={i}>
                        {size.id == orderInquiry['size_category'] &&
                            <CostingCard>
                                <RitzMultiSelectCheckBox
                                    id={'ordersizes'}
                                    selectOptions={size?.category_options}
                                    optionValue={'id'}
                                    optionDisplayValue={'name'}
                                    handleOnChange={handleOnChangeSize}
                                    selectedValues={sizeIds}
                                    labelText={'Select Sizes:'}
                                    handleOnClose={() => console.log('todo remove this')}
                                />
                                <RitzFormErrors errorList={formErrors?.[API_SIZES_FIELD]}/>
                            </CostingCard>
                        }
                    </React.Fragment>
                ))}

                {(sizeIds.length > 0 || orderInquiry['costing_method']) &&
                    <>
                        <CostingCard>
                            <RitzRadio
                                options={costingMethods}
                                name={'size_pricing_types'}
                                id={"size_pricing_types"}
                                isMulti={false}
                                selectedValue={orderInquiry?.['costing_method']}
                                isRequired={true}
                                labelText={"Select Costing Method:"}
                                handleOnChange={handleOnChangeSizePricingType}
                                optionValue={'id'}
                                optionText={'name'}
                            ></RitzRadio>
                            <RitzFormErrors errorList={formErrors?.[API_COSTING_METHOD_FIELD]}/>
                        </CostingCard>

                        {orderInquiry?.['costing_method'] == GROUP_SIZES_PRICING_TYPE &&
                            <CostingCard>
                                <RitzMultiSelectInput
                                    name={'ordergroup'}
                                    labelText={'Size Groups'}
                                    headerText={'Group Sizes'}
                                    handleOnDelete={handleOnDeleteSizeGroups}
                                    handleOnCreateAndUpdate={handleOnChangeSizeGroups}
                                    dropDownOptions={orderInquiry?.['sizes']}
                                    currentDataParentField='id'
                                    currentDataValueField='order_sizes_details'
                                    selectedValue={orderInquiry?.['size_groups']?.length}
                                    currentData={orderInquiry?.['size_groups']}
                                    optionsValueField={'size'}
                                />
                                <RitzFormErrors errorList={formErrors?.[API_SIZE_GROUPS_FIELD]}/>
                            </CostingCard>
                        }
                    </>
                }

                <CostingActionButtons
                    showNext={true}
                    showPrevious={true}
                    nextButtonOnClickAction={handleNextButton}
                    previousButtonOnClickAction={handlePreviousButton} 
                    showSave={true} 
                    saveButtonOnClickAction={() => validateOrderSizeForm(true)}
                    errors={formErrors}
                    saving={isSaving}
                />

            </CostingFormLayout>}
        </>
    );
};

export default OrderInquirySizes;
