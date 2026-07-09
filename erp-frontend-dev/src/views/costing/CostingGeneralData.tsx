
import { Box, Button } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader';
import CostingCard from '@/components/OrderInquiry/Costing/CostingCard';
import RitzRadio from '@/components/Ritz/RitzRadio';
import api from '@/services/api';
import * as restUrls from "@/helpers/constants/RestUrls";
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzInput from '@/components/Ritz/RitzInput';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { updateOrderInquiryGeneralDataURL } from '@/helpers/constants/RestUrls';
import SaveSpinner from '@/components/SaveSpinner';

const CostingGeneralData = ({ costingData, refreshData }: any) => {
    const customerFieldName = 'customer';
    const brandFieldName = 'brand';
    const seasonFieldName = 'season';
    const descriptionFieldName = 'style_description';
    const yearFieldName = 'year';
    const styleNumberPerPackFieldName = 'style_number';

    const [isLoading, setIsLoading] = useState<any>(true);
    const [isSaving, setIsSaving] = useState<any>(false);
    const [metaData, setMetaData] = useState<any>({});
    const [selectedCostingData, setSelectedCostingData] = useState<any>(costingData);

    const fetchCustomerBasedMetaData = () => {
        if (costingData?.order_inquiry?.[brandFieldName]) {
            const brandId = {
                brand_id: selectedCostingData?.order_inquiry?.[brandFieldName] > 0 ? selectedCostingData?.order_inquiry?.[brandFieldName] : null
            }
            api.post(restUrls.getGeneralInfoCustomerBrandFilteredMetaDataURL(selectedCostingData?.order_inquiry?.[customerFieldName]), brandId)
                .then(resp => {
                    const metadata = resp?.data || {};
                    setMetaData({ ...metadata })
                })
                .catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                }).finally(() => {
                    setIsLoading(false)
                })
        }
    }

    const handleOnChangeGeneralInfoForm = (event: any) => {
        const { name, value } = event?.target;
        setSelectedCostingData((prevData: any) => ({
            ...prevData,
            order_inquiry: {
                ...prevData?.order_inquiry,
                [name]: value
            }
        }));
    };

    const handleSaveData = () => {
        setIsSaving(true)
        const request = {
            method: 'post',
            url: updateOrderInquiryGeneralDataURL(selectedCostingData?.order_inquiry?.id),
            data: {
                [seasonFieldName]: parseFloat(selectedCostingData?.order_inquiry?.[seasonFieldName]),
                [yearFieldName]: selectedCostingData?.order_inquiry?.[yearFieldName],
                [styleNumberPerPackFieldName]: selectedCostingData?.order_inquiry?.[styleNumberPerPackFieldName],
                [descriptionFieldName]: selectedCostingData?.order_inquiry?.[descriptionFieldName]
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    useEffect(() => {
        if (costingData) {
            fetchCustomerBasedMetaData()
        }
    }, [costingData]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <Box marginBottom={2} >
                    <CostingCard id="seasons-holder">
                        <RitzRadio
                            options={metaData?.seasons}
                            name={seasonFieldName}
                            id="season"
                            isMulti={false}
                            selectedValue={selectedCostingData?.order_inquiry?.[seasonFieldName]}
                            isRequired={true}
                            labelText="Select Season:"
                            handleOnChange={handleOnChangeGeneralInfoForm}
                            optionValue="id"
                            optionText="name"
                            row={false}
                        ></RitzRadio>
                    </CostingCard>
                    <CostingCard id="yearlist-holder">
                        <RitzRadio
                            options={selectedCostingData?.metadata?.year_list}
                            name={yearFieldName}
                            id={"year"}
                            isMulti={false}
                            selectedValue={selectedCostingData?.order_inquiry?.[yearFieldName]}
                            isRequired={true}
                            labelText={"Select Year:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                            optionValue={'id'}
                            optionText={'name'}
                            row={false}
                        />
                    </CostingCard>
                    <CostingCard id="stylenumber-holder">
                        <RitzInput
                            name={styleNumberPerPackFieldName}
                            id={"style_number"}
                            selectedValue={selectedCostingData?.order_inquiry?.[styleNumberPerPackFieldName]}
                            isMulti={false}
                            isRequired={true}
                            row={false}
                            labelText={"Enter Style Number:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                        />
                    </CostingCard>
                    <CostingCard id="styledescription-holder">
                        <RitzInput
                            name={descriptionFieldName}
                            id={"style_description"}
                            selectedValue={selectedCostingData?.order_inquiry?.[descriptionFieldName]}
                            isMulti={true}
                            row={false}
                            isRequired={true}
                            labelText={"Enter Description:"}
                            handleOnChange={handleOnChangeGeneralInfoForm}
                        />
                    </CostingCard>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt:1}}>
                        <Button disabled={isSaving} variant="contained" onClick={() => { handleSaveData(); }} size="small" color="primary"> {isSaving && <SaveSpinner />}Update</Button>
                    </Box>
                </Box>
            )}
        </>
    )
}

export default CostingGeneralData;
