import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import { useRouter } from "next/router";
import RitzTextInput from "@/components/Ritz/RitzNumberInput/RitzTextInput";
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import CostingFormLayout from "@/components/OrderInquiry/Costing/CostingForm";
import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import { costingOrderItemsURL, costingOrderColorwaysURL } from "@/helpers/constants/FrontEndUrls";
import * as yup from "yup";
import RitzFormErrors from "@/components/Ritz/RitzFormErrors";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";

const OrderColorwayCategory = ({ orderId }: any) => {
    // Colorway Category fields
    const idFieldName = 'id';
    const colorwayCategoryFieldName = 'colorway_category';
    const typeCountFieldName = 'type_count';
    const typesFieldName = 'types';
    const orderFieldName = 'order';
    const deletedFieldName = 'deleted';
    const nameFieldName = 'name';

    // Colorway Category Type fields
    const cwCategoryTypeIDFieldName = 'id';
    const cwCategoryTypeOrderCWCategoryFieldName = 'order_colorway_category';
    const cwCategoryTypeNameFieldName = 'name';

    // Local States
    const [cwCategories, setCwCategories] = useState([]);
    const [orderColorwayCategories, setOrderColorwayCategories] = useState([]);
    const [formErrors, setFormErrors] = useState<{}>({hasErrors: false});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Utils
    const dispatch = useDispatch();
    const router = useRouter();

    const nextButtonClicked = useRef(false);
    const previousButtonClicked = useRef(false);

    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL()),
            api.get(restUrls.costingOrderColorwayCategories(orderId)),
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata, orderCategories] = respData;

            setCwCategories(metadata?.colorway_categories);
            setOrderColorwayCategories(orderCategories);

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

    // Fetch Order inquiry details
    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    useEffect(() => {
        if (formErrors?.['hasErrors']) {
            validateOrderColorwayCategoriesAndSave(false);
        }
    }, [orderColorwayCategories]);

    /** Colorway categories */
    const handleColorwayCategoryOnChange = (event: any) => {
        const { value, checked } = event.target;

        const categories = [...cwCategories];
        const category = categories.filter((category) => category?.id == value)[0];
        let orderColorwayCategoriesCopy = [...orderColorwayCategories];

        if (checked) {
            if (orderColorwayCategories.filter((cwCategory: any) => (cwCategory?.[colorwayCategoryFieldName] == value)).length == 0) {
                orderColorwayCategoriesCopy.push({
                    [idFieldName]: null,
                    [colorwayCategoryFieldName]: value,
                    [typeCountFieldName]: 0,
                    [typesFieldName]: [],
                    [orderFieldName]: orderId,
                    [deletedFieldName]: false,
                    [nameFieldName]: category?.name
                });
            }
        } else {
            const catIndex = orderColorwayCategoriesCopy.findIndex(cwCat => cwCat?.[colorwayCategoryFieldName] == value);
            orderColorwayCategoriesCopy.splice(catIndex, 1);
        }
        setOrderColorwayCategories([...orderColorwayCategoriesCopy]);
    }

    const handleOnChangeNumberOfColorwayCategoryTypes = (event: any, value: number, categoryID: any) => {
        console.log(orderColorwayCategories)
        let orderColorwayCategoriesCopy = [...orderColorwayCategories];
        let catIndex = orderColorwayCategoriesCopy.findIndex((orderCwCat: any) => orderCwCat?.[colorwayCategoryFieldName] == categoryID);
        orderColorwayCategoriesCopy[catIndex][typeCountFieldName] = value;

        let cwCatTypes = orderColorwayCategoriesCopy[catIndex][typesFieldName]
        while (cwCatTypes.length < value) {
            cwCatTypes.push({
                [cwCategoryTypeIDFieldName]: null,
                [cwCategoryTypeOrderCWCategoryFieldName]: categoryID,
                [cwCategoryTypeNameFieldName]: ""
            })
        }
        setOrderColorwayCategories([...orderColorwayCategoriesCopy]);
     }

    const handleOnDeleteColorwayCategoryType = (event: any, item: any, typeIndex: any, categoryID: any) => {
        let orderColorwayCategoriesCopy = [...orderColorwayCategories];
        let cwCategory = orderColorwayCategoriesCopy.filter((orderCwCat: any) => orderCwCat?.[colorwayCategoryFieldName] == categoryID)?.[0];
        cwCategory?.[typesFieldName].splice(typeIndex, 1);
        setOrderColorwayCategories([...orderColorwayCategoriesCopy]);
    }

    const handleOnCreateAndUpdateCategoryType = (index: any, newData: any, categoryID: any) => {
        let orderColorwayCategoriesCopy = [...orderColorwayCategories];
        orderColorwayCategoriesCopy[index] = {...orderColorwayCategoriesCopy[index], [typesFieldName]: newData };
        console.log("Thisis it")
        setOrderColorwayCategories(orderColorwayCategoriesCopy);
    }

    const saveOrderColorwayCategoryForm = () => {
        api.post(restUrls.costingOrderColorwayCategories(orderId), orderColorwayCategories).then(resp => {
            setIsSaving(false);
            if (nextButtonClicked.current) {
                router.push(costingOrderColorwaysURL(orderId));
            } else if (previousButtonClicked.current) {
                router.push(costingOrderItemsURL(orderId));
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

    const validateOrderColorwayCategoriesAndSave = (save=true) => {
        setIsSaving(true);

        const colorwayTypeErrors = {}
        let itemFormErrors = { hasErrors: false };
        const colorwayCategorySchema = yup.object({
            [colorwayCategoryFieldName]: yup.array().min(1, "Select at least 1 Colorway Category").test(
                'cw_category_invalid',
                '',
                (value, context) => {
                    value.forEach( (cw_category: any) => {
                        let nonEmptyTypes = cw_category?.types?.filter((type: any) => type.name.trim().length > 0);
                        // Validate if there cw categories to match the type count entered and if they are not empty
                        if (cw_category.type_count != cw_category.types.length || nonEmptyTypes.length != cw_category.type_count) {
                            itemFormErrors.hasErrors = true;
                            colorwayTypeErrors[cw_category.colorway_category] = [`Please enter ${cw_category.type_count} Categories`];
                            context.createError({message: ""});
                        } else if (!cw_category?.types || cw_category?.types.length == 0 || cw_category?.type_count == 0) {
                            itemFormErrors.hasErrors = true;
                            colorwayTypeErrors[cw_category.colorway_category] = [`Please enter Number of Categories`];
                            context.createError({message: ""});
                        }
                    });
                    return !itemFormErrors.hasErrors;
            })
        });

        colorwayCategorySchema.validate({
            [colorwayCategoryFieldName]: orderColorwayCategories
        }, {abortEarly: false}).catch((err) => {

            itemFormErrors = err.inner.reduce((acc: any, error: any) => {
                return {
                    ...acc,
                    [error.path]: error.errors,
                    hasErrors: true
                }
            }, {});
        }).then(() => {
            if (!itemFormErrors.hasErrors) {
                setFormErrors({...itemFormErrors, hasErrors: false});
                if (save) {
                    saveOrderColorwayCategoryForm();
                } else {
                    setIsSaving(false);
                }
            } else {
                setIsSaving(false);
                nextButtonClicked.current = false;
                previousButtonClicked.current = false;
                setFormErrors({...itemFormErrors, colorway_category_type_errors: {...colorwayTypeErrors}});
            }
        }).finally(() =>{console.log(orderColorwayCategories);});
    }

    const handlePreviousButton = () => {
        previousButtonClicked.current = true;
        validateOrderColorwayCategoriesAndSave();
    }

    const handleNextButton = () => {
        nextButtonClicked.current = true;
        validateOrderColorwayCategoriesAndSave();
    }


    return (
        <>{isLoading ? <DefaultLoader /> : 
            <CostingFormLayout step={4} formValues={{colorway_categories: orderColorwayCategories}}>
                <CostingCard>
                    <RitzCheckBox
                        labelText={'Select Colorway Categories:'}
                        options={cwCategories}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedOptionValue={colorwayCategoryFieldName}
                        selectedValues={orderColorwayCategories}
                        handleOnChange={handleColorwayCategoryOnChange}
                        row={true}
                    />
                    <RitzFormErrors errorList={formErrors?.[colorwayCategoryFieldName]}/>

                </CostingCard>
                {orderColorwayCategories?.map((colorwayCategory: any, index: number) => (
                    <CostingCard key={colorwayCategory?.id || index}>
                        <RitzTextInput
                            name={`${colorwayCategory.id}_category_types`}
                            id={`${colorwayCategory.id}_category_types`}
                            labelText={`${colorwayCategory?.name} Colorway Category Types`}
                            selectedValue={colorwayCategory?.[typeCountFieldName]}
                            currentData={colorwayCategory?.[typesFieldName]}
                            headerText={`${colorwayCategory?.name} Types`}
                            triggerHandleOnDeleteForEmptyValue={true}
                            handleOnChangeNumInputs={(event: any, value: number) => handleOnChangeNumberOfColorwayCategoryTypes(event, value, colorwayCategory?.[colorwayCategoryFieldName])}
                            handleOnDelete={(event: any, item: any, index: any) => handleOnDeleteColorwayCategoryType(event, item, index, colorwayCategory?.[colorwayCategoryFieldName])}
                            handleOnCreateAndUpdate={(newData: any) => handleOnCreateAndUpdateCategoryType(index, newData, colorwayCategory?.[colorwayCategoryFieldName])}
                        />
                        <RitzFormErrors errorList={formErrors?.['colorway_category_type_errors']?.[colorwayCategory.colorway_category]}/>
                    </CostingCard>
                ))}
                <CostingActionButtons
                    showNext={true} nextButtonOnClickAction={handleNextButton}
                    showSave={true}
                    saveButtonOnClickAction={validateOrderColorwayCategoriesAndSave}
                    showPrevious={true}
                    previousButtonOnClickAction={handlePreviousButton}
                    errors={formErrors}
                    saving={isSaving}
                />
            </CostingFormLayout>
        }</>
    )
};

export default OrderColorwayCategory;