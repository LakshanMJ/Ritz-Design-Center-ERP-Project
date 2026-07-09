import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import RitzInput from "@/components/Ritz/RitzInput"
import { Box, Button, Card, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material"
import { useState } from "react";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { useSelector } from "react-redux";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import router from "next/router";
import { orderSummaryVersionURL } from "@/helpers/constants/FrontEndUrls";
import CircularLoader from "@/components/CircularLoader";

interface CountryData {
    id: number;
    name: string;
  }

const PrecostingColorwayMapping = ({orderId,versionId,onSubmitSuccess}:any) => {
    const orderInquiryDataSet = useSelector((state: any) => state.CostingReducer?.order_inquiry);
    const [precostingColorwayMappingState, setPrecostingColorwayMappingState] = useState({
        numberOfColorways: null,
        preCostingColorways: [],
        selectedMarketingCostingColorways:[],
        selectedOrderCountries: [],
      });
    const [countryColorwaySizeQuantitycombinedState, setCountryColorwaySizeQuantitycombinedState] = useState([]);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);

    const handlePreCostingDataSave = () => {
        setIsLoadingCircularLoader(true);
        const request = {
            method: 'post',
            url: restUrls.preCostingColorwayMappingCreate(orderId,versionId),
            data: {
                colorways: precostingColorwayMappingState?.selectedMarketingCostingColorways || [],
                data: (countryColorwaySizeQuantitycombinedState || []).map((country: any) => ({
                    country_id: country?.country_id,
                    order_country_id: country?.order_country_id,
                    colorways: (country?.colorways || []).map((colorway: any) => ({
                        id: colorway?.id,
                        name: colorway?.name,
                        marketing_costing_colorway_id: colorway?.marketing_costing_colorway_id || null,
                        sizes: (colorway?.sizes || []).map((size: any) => ({
                            id: size?.id,
                            quantity: size?.quantity || 0
                        }))    
                    }))
                })),
            }
        }
        api(request).then(resp => {
            const responseData = resp?.data || [];
            if(responseData){
                router.push(orderSummaryVersionURL(responseData?.costing_id, responseData?.costing_version_id));
            }
            toast.success(DEFAULT_SUCCESS);
            onSubmitSuccess()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        setIsLoadingCircularLoader(false);
        });
    }

    const handleOnChangeNumInputs = (event:any) => {
        const newValue = event?.target?.value.replace(/[^0-9]/g, '').slice(0, 30);
        const numericNewValue = parseInt(newValue, 10);
        updatePrecostingColorwayMappingState("numberOfColorways", numericNewValue);

        if (numericNewValue > precostingColorwayMappingState.numberOfColorways) {
            const newColorways = [...precostingColorwayMappingState.preCostingColorways];
            for (let i = newColorways?.length; i < numericNewValue; i++) {
                newColorways.push({ name: `CW ${i + 1}`,id:`CW_${i + 1}`,is_new: true });
            }
            updatePrecostingColorwayMappingState("preCostingColorways", newColorways);
        }else{
            const reducedColorways = precostingColorwayMappingState.preCostingColorways.slice(0, numericNewValue);
            updatePrecostingColorwayMappingState("preCostingColorways", reducedColorways);
        }
    
        setCountryColorwaySizeQuantitycombinedState((prevState: any[]) => {
            return prevState.map((country: any) => {
                const updatedColorways = [...country.colorways];

                if (numericNewValue > country?.colorways.length) {
                    for (let i = country?.colorways.length; i < numericNewValue; i++) {
                        const sizesTemplate = country?.colorways[0]?.sizes.map((size: any) => ({
                            ...size,
                            quantity: 0,
                        }));
                        updatedColorways.push({
                            id: `CW_${i + 1}`,
                            name: `CW ${i + 1}`,
                            sizes: sizesTemplate,
                            marketing_costing_colorway_id: null,
                        });
                    }
                } else {
                    updatedColorways.splice(numericNewValue);
                }
                return { ...country, colorways: updatedColorways };
            });
        });
        
    };


    const handleOnChangePreCostingColorwayNameChange = (index:any, event: any) => {
        let preCostingColorwayName = event?.target?.value
        const updatedColorways = precostingColorwayMappingState?.preCostingColorways.map((cw,id) => {
            if (index === id) {
                return {...cw , name:preCostingColorwayName};
            }
            return cw;
        });
        updatePrecostingColorwayMappingState("preCostingColorways", updatedColorways);
    
        if(precostingColorwayMappingState?.selectedOrderCountries.length>0){
            const colorways = updatedColorways?.map((cw: any) => {
                const matchingColorway = precostingColorwayMappingState?.selectedMarketingCostingColorways.find(
                    (selectedColorway: any) =>
                        selectedColorway?.pre_costing_colorway_id === cw.id
                );
        
                return {
                    name: cw?.name,
                    sizes: [
                        ...(cw.sizes || []),
                        ...((
                            orderInquiryDataSet?.sizes)|| [].map((size: any) => ({
                            id: size?.id,
                            name: size?.name,
                            order_size_id: 0,
                            quantity: size?.quantity ||0,
                        })) || []),
                    ],
                    marketing_costing_colorway_id: matchingColorway?.marketing_costing_colorway_id,
                };
            });
            const newState = precostingColorwayMappingState?.selectedOrderCountries.map((countryObj) => ({
                ...countryObj,
                order_country_id: 0,
                colorways: colorways,
            }));
                setCountryColorwaySizeQuantitycombinedState(newState);
        }}

    const handleMarketingCostingColorwaysSelect = (index: number, marketingCostingColorwayId:number,marketingCostingColorway:any,preCostingColorway:any,preCostingColorwayId:any) => {
        const updatedColorways = [...precostingColorwayMappingState?.selectedMarketingCostingColorways];
        updatedColorways[index] = {
            ...updatedColorways[index],
                'marketing_costing_colorway': marketingCostingColorway?.colorway,
                'marketing_costing_colorway_id': marketingCostingColorwayId,
                'pre_costing_colorway': preCostingColorway,
                'pre_costing_colorway_id': preCostingColorwayId
        };
        updatePrecostingColorwayMappingState('selectedMarketingCostingColorways',updatedColorways)

        const updatedState = countryColorwaySizeQuantitycombinedState.map((country) => {
            return {
              ...country,
              colorways: country.colorways.map(({colorway, colorwayIndex}:any) => {
                if (colorwayIndex === index) {
                  return {
                    ...colorway,
                    marketing_costing_colorway_id: marketingCostingColorwayId,
                  };
                }
                return colorway; 
              }),
            };
          });
    
        setCountryColorwaySizeQuantitycombinedState(updatedState);
    };

    const handleOnChangeCountry = (event: any) => {
        const {value, checked} = event?.target;
        const countryData = (
            orderInquiryDataSet?.countries).find((item: CountryData) => item?.id === Number(value));
        const text = countryData?.name;
        let newOrderCountries;
        if (checked) {
            newOrderCountries = [...precostingColorwayMappingState?.selectedOrderCountries, { country_id: Number(value), country_name: text }];
        } else {
            newOrderCountries = precostingColorwayMappingState?.selectedOrderCountries.filter((orderCountry: any) => orderCountry?.country_id !== parseInt(value));   
            
        }
       updatePrecostingColorwayMappingState('selectedOrderCountries',newOrderCountries)

        const colorways = precostingColorwayMappingState?.preCostingColorways?.map((cw: any) => {
            const matchingColorway = precostingColorwayMappingState?.selectedMarketingCostingColorways.find(
                (selectedColorway: any) =>
                    selectedColorway?.pre_costing_colorway_id === cw.id
            );

            return {
                name: cw?.name,
                sizes: [
                    ...(cw.sizes || []),
                    ...((
                        orderInquiryDataSet?.sizes)|| [].map((size: any) => ({
                        id: size?.id,
                        name: size?.name,
                        order_size_id: 0,
                        quantity: size?.quantity || 0,
                    })) || []),
                ],
                marketing_costing_colorway_id: matchingColorway?.marketing_costing_colorway_id || null,
            };
        });

        const newState = newOrderCountries.map((countryObj) => ({
            ...countryObj,
            order_country_id: 0,
            colorways: colorways,
        }));
            setCountryColorwaySizeQuantitycombinedState(newState);
    }

    const handleOnChangeQuantity = (countryIndex: number, colorwayIndex: number, sizeIndex: number, newQuantity: any) => {
        const countryColorwaySizeQuantitycombinedStateCopy = countryColorwaySizeQuantitycombinedState.map((country, cIndex) => {
            if (cIndex === countryIndex) {
                return {
                    ...country,
                    colorways: country?.colorways.map((colorway:any, cwIndex:any) => {
                        if (cwIndex === colorwayIndex) {
                            return {
                                ...colorway,
                                sizes: colorway?.sizes.map((size:any, sIndex:any) => {
                                    if (sIndex === sizeIndex) {
                                        return {
                                            ...size,
                                            quantity: Number(newQuantity) || 0,
                                        };
                                    }
                                    return size;
                                }),
                            };
                        }
                        return colorway;
                    }),
                };
            }
            return country;
        });
        setCountryColorwaySizeQuantitycombinedState(countryColorwaySizeQuantitycombinedStateCopy);
    };

    const updatePrecostingColorwayMappingState = (key: keyof typeof precostingColorwayMappingState, value: any) => {
        setPrecostingColorwayMappingState((prevState) => ({
          ...prevState,
          [key]: value,
        }));
      };
    
    return(
        <>
        <Card variant="outlined" style={{ padding: '16px' }}>
            <>
                <Typography variant="h6" gutterBottom  sx={{ marginTop: 2 }}>Enter Number of Pre Costing Colorways:</Typography>
                <TextField
                    id="outlined-basic"
                    label=""
                    variant="outlined"
                    value={precostingColorwayMappingState?.numberOfColorways || 0}
                    onInput={handleOnChangeNumInputs}
                />
            </>
            <Box sx={{ mt: 2 }}>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {Array.from({ length: precostingColorwayMappingState?.numberOfColorways }).map((colorway, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            id="outlined-basic"
                            label=""
                            variant="outlined"
                            value={precostingColorwayMappingState.preCostingColorways[index]?.name}
                            onInput={(event) => handleOnChangePreCostingColorwayNameChange(index,event)}
                        />
                    </Box>
            ))}
            </Box>
        </Box>
            
            {precostingColorwayMappingState?.numberOfColorways && (
                <>
                    <Typography variant="h6" gutterBottom  sx={{ marginTop: 2 }}>Colorway Mapping:</Typography>
                    <Card variant="outlined" sx={{ mb: 3, mt: 1}}>
                        <Table aria-label="simple table" >
                            <TableHead>
                                <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                    <TableCell>Pre Costing Colorway</TableCell>
                                    <TableCell>Marketing Costing Colorway</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {precostingColorwayMappingState?.preCostingColorways?.map((item: any, index: any) => (
                                    <TableRow  key={index}>
                                        <TableCell>{item?.name}</TableCell>
                                        <TableCell>
                                            <Select
                                                id={'marketing_costing_colorway'}
                                                name={'marketing_costing_colorway'}
                                                labelId={'marketing_costing_colorway'}
                                                value={precostingColorwayMappingState?.selectedMarketingCostingColorways[index]?.marketing_costing_colorway_id  || precostingColorwayMappingState?.selectedMarketingCostingColorways[index]?.marketing_costing_colorway || ''}

                                                sx={{ width: '100%' }}
                                                onChange={(event: any) => {
                                                    const marketingCostingColorwayId = event?.target?.value;
                                                    const marketingCostingColorway = orderInquiryDataSet?.colorways.find(
                                                        (option: any) => option.id === marketingCostingColorwayId
                                                    );
                                                    handleMarketingCostingColorwaysSelect(index,marketingCostingColorwayId,marketingCostingColorway,item?.name,item?.id)
                                                }}
                                            >   
                                                {
                                                    orderInquiryDataSet?.colorways.map((option: any) => (
                                                        <MenuItem key={option.id} value={option.id}>
                                                            {option?.colorway}
                                                        </MenuItem>
                                                    ))
                                                }
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}

            {precostingColorwayMappingState?.numberOfColorways && (
                <>
                    <Typography variant="h6" gutterBottom >Select Countries:</Typography>
                    <Card variant="outlined" style={{ padding: '16px' }}>
                        <RitzCheckBox
                            id={'name'}
                            name={'country_name'}
                            isRequired={true}
                            options={orderInquiryDataSet?.countries}
                            selectedValues={precostingColorwayMappingState?.selectedOrderCountries}
                            optionValue={'id'}
                            optionText={'name'}
                            row={true}
                            selectedOptionValue={'country_id'}
                            handleOnChange={handleOnChangeCountry}
                        >    
                        </RitzCheckBox>
                    </Card>
                </>
            )}

            {precostingColorwayMappingState?.selectedOrderCountries && precostingColorwayMappingState?.selectedOrderCountries.length > 0 && (
                <>
                    <Card variant="outlined" sx={{ mb: 3, mt: 1}}>
                        <Table aria-label="simple table">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                <TableCell align="center">Counrty</TableCell>
                                <TableCell align="center">Pre Costing Colorway</TableCell>
                                <TableCell align="center">Size</TableCell>
                                <TableCell align="center">Quantity</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {countryColorwaySizeQuantitycombinedState?.map((row, rowIndex) => {
                                    let countryRowSpan = row?.colorways.reduce(
                                        (acc:any, colorway:any) => acc + colorway?.sizes.length,0);
                                    return row.colorways.map((colorway:any, colorwayIndex:number) => {
                                        let colorwayRowSpan = colorway?.sizes.length;
                                        return colorway?.sizes.map((size:any, sizeIndex:number) => (
                                            <TableRow key={`${rowIndex}-${colorway?.name}-${sizeIndex}`}>
                                                {colorwayIndex === 0 && sizeIndex === 0 && (
                                                    <TableCell  sx={{ borderRight: "1px solid #ddd", padding: '4px 8px'}} align="center" rowSpan={countryRowSpan}>{row?.name || row?.country_name}</TableCell>
                                                )}
                                                {sizeIndex === 0 && (
                                                    <TableCell  sx={{ borderRight: "1px solid #ddd", padding: '4px 8px'}} align="center" rowSpan={colorwayRowSpan}>
                                                        {colorway?.name || '--'}
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ borderRight: "1px solid #ddd", padding: '4px 8px'}}>{size?.name}</TableCell>
                                                <TableCell sx={{ width: "300px", padding: '4px 8px' }}>
                                                    <RitzInput
                                                        isRequired={true}
                                                        name={'name'}
                                                        id={'id'}
                                                        style={{ width: "100%" }}
                                                        align="center" 
                                                        selectedValue={
                                                            countryColorwaySizeQuantitycombinedState[rowIndex]?.colorways[colorwayIndex]?.sizes[sizeIndex]?.quantity || 0
                                                        }
                                                        handleOnChange={(e:any) =>
                                                            handleOnChangeQuantity(
                                                                rowIndex,
                                                                colorwayIndex,
                                                                sizeIndex,
                                                                e?.target?.value
                                                            )
                                                        }
                                                    >
                                                    </RitzInput>
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    });
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
           {isLoadingCircularLoader ? <CircularLoader /> :
            <Button 
                variant='contained'
                onClick={handlePreCostingDataSave}
                >
            Submit
            </Button>
           } 
            </Box>
        </Card>
        </>
    )
}
export default PrecostingColorwayMapping
