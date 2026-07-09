import React, { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Card } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RitzCheckBoxHorizontal from '@/components/Ritz/RitzCheckBoxHorizontal';
import { debug } from 'console';

const PackDataFilter = ({ orderInquiryDetails, onUpdateMainState, onUpdateUniqueOrderItems, itemId, selectedFilterData }: any) => {
    const [state, setState] = useState({ country: [], colorway: [], size: [], item: [], colorway_category: [] });
    const [uniqueOrderItems, setUniqueOrderItems] = useState<any>([]);
    const handleCheckboxChanges = (event: any, category: any) => {
        const { value, checked } = event.target;
        const newStateItem = { [category]: parseInt(value) };
        setState(prevState => {
            const newState = { ...prevState } as any;
            if (checked) {
                newState[category] = [...newState[category], newStateItem];
            } else {
                newState[category] = newState[category].filter((item: { [item: number]: number; }) => item[category] !== parseInt(value));
            }
            onUpdateMainState(newState);
            return newState;
        });
    };
    const getUniqueItemsRelatedToItem = () => {
        const filteredItems = orderInquiryDetails?.items?.filter((item: { item: any; }) => item.item === itemId);
        setUniqueOrderItems(filteredItems);
        onUpdateUniqueOrderItems(filteredItems);
    };

    useEffect(() => {
        if (itemId) {
            getUniqueItemsRelatedToItem();
        }
    }, [itemId]);

    useEffect(() => {
        if (selectedFilterData) {
            setState({
                country: selectedFilterData.country,
                colorway: selectedFilterData.colorway,
                colorway_category: selectedFilterData.colorway_category,
                size: selectedFilterData.size,
                item: selectedFilterData.item,
            });
        }
    }, [selectedFilterData]);

    return (
        <Box sx={{ mb: 2 }}>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><FilterAltIcon />Filter Order Packs</AccordionSummary>
                <AccordionDetails>
                    <Card sx={{ mb: 1, padding: 2 }}>
                        <RitzCheckBoxHorizontal
                            id={'country'}
                            name={'country'}
                            isRequired={true}
                            options={orderInquiryDetails.countries}
                            selectedValues={state.country}
                            optionValue={'id'}
                            optionText={'name'}
                            labelText={"Select Order Countries:"}
                            row={true}
                            selectedOptionValue={'country'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "country")}
                        />
                    </Card>
                    {itemId && (
                        <>
                            <Card sx={{ mb: 1, padding: 2 }}>
                                <RitzCheckBoxHorizontal
                                    id={'order_item'}
                                    name={'order_item'}
                                    isRequired={true}
                                    options={uniqueOrderItems}
                                    selectedValues={state.item}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    labelText={"Select Order Items:"}
                                    row={true}
                                    selectedOptionValue={'item'}
                                    handleOnChange={(event: any) => handleCheckboxChanges(event, "item")}></RitzCheckBoxHorizontal>
                            </Card>
                            <Card sx={{ mb: 1, padding: 2 }}>
                                <RitzCheckBoxHorizontal
                                    id={'order_colorway_category'}
                                    name={'order_colorway_category'}
                                    isRequired={true}
                                    options={orderInquiryDetails.unique_colorway_categories}
                                    selectedValues={state.colorway_category}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    labelText={"Select Order Colorway Categories:"}
                                    row={true}
                                    selectedOptionValue={'colorway_category'}
                                    handleOnChange={(event: any) => handleCheckboxChanges(event, "colorway_category")}></RitzCheckBoxHorizontal>
                            </Card>
                        </>
                    )}
                    <Card sx={{ mb: 1, padding: 2 }}>
                        <RitzCheckBoxHorizontal
                            id={'order_colorway'}
                            name={'order_colorway'}
                            isRequired={true}
                            options={orderInquiryDetails.colorways}
                            selectedValues={state.colorway}
                            optionValue={'id'}
                            optionText={'colorway'}
                            labelText={"Select Order Colorways:"}
                            row={true}
                            selectedOptionValue={'colorway'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "colorway")}
                        />
                    </Card>
                    <Card sx={{ mb: 1, padding: 2 }}>
                        <RitzCheckBoxHorizontal
                            id={'order_sizes'}
                            name={'order_sizes'}
                            isRequired={true}
                            options={orderInquiryDetails.sizes}
                            selectedValues={state.size}
                            optionValue={'id'}
                            optionText={'name'}
                            labelText={"Select Order Sizes:"}
                            row={true}
                            selectedOptionValue={'size'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "size")}
                        />
                    </Card>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};

export default PackDataFilter;