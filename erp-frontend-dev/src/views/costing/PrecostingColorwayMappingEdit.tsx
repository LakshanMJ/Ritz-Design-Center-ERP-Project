import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import RitzInput from "@/components/Ritz/RitzInput"
import { Alert, Box, Button, Card, IconButton, InputAdornment, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import router from "next/router";
import { orderSummaryVersionURL } from "@/helpers/constants/FrontEndUrls";
import CircularLoader from "@/components/CircularLoader";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from "@/components/SaveSpinner";

const PrecostingColorwayMapping = ({orderId,versionId,onSubmitSuccess,preCostingverifying,isSaving,fetchData}:any) => {

    const [precostingColorwayMappingState, setPrecostingColorwayMappingState] = useState({
        numberOfColorways: null,
        selectedOrderCountries: [],
        preCostingColorways: [],
    });
    const [countryColorwaySizeQuantitycombinedState, setCountryColorwaySizeQuantitycombinedState] = useState<any>({});
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [showClorwayDeleteIcon, setShowClorwayDeleteIcon] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const existingPrecostingDataFetch = () => {
        setIsLoading(true)
        api.get(restUrls.preCostingColorwayMappingDetails(Number(orderId), Number(versionId))).then(resp => {
            const respData = resp?.data || {};
            const numberOfColorways = respData?.no_of_colorways;
            const preCountryValues = respData?.data?.map(({ country_name, country_id }: any) => ({ country_name, country_id }));
            const colorway_mapping = respData?.colorway_mapping;
            updatePrecostingColorwayMappingState("numberOfColorways", numberOfColorways);
            updatePrecostingColorwayMappingState("selectedOrderCountries", preCountryValues);
            updatePrecostingColorwayMappingState("preCostingColorways", colorway_mapping);

            setCountryColorwaySizeQuantitycombinedState({ ...respData });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    }

    const verifyAndSave = () => {
        handlePreCostingEditDetailsSave('verifyAndSave');
    }

    const handlePreCostingEditDetailsSave = (type:any) => {
        const initialColorways = precostingColorwayMappingState?.preCostingColorways;
        const currentColorways = countryColorwaySizeQuantitycombinedState?.data[0]?.colorways;

        const deleted_colorways = initialColorways.filter(
            (colorway) => !currentColorways.some((current:any) => current?.id === colorway?.pre_costing_colorway_id)
        ).map((colorway) => colorway?.pre_costing_colorway_id);

        setIsLoadingCircularLoader(true)

        const request = {
            method: 'put',
            url: restUrls.preCostingColorwayMappingEdit(orderId,versionId),
            data: {
                ...countryColorwaySizeQuantitycombinedState || [],
                deleted_colorways
            }
        }
        api(request).then(resp => {
            const responseData = resp?.data || [];
            if(responseData){
                router.push(orderSummaryVersionURL(responseData?.costing_id, responseData?.costing_version_id));
            }
            toast.success(DEFAULT_SUCCESS);
            if (type === 'verifyAndSave'){
                preCostingverifying();
            }
            onSubmitSuccess()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoadingCircularLoader(false)
            fetchData()
        });
    }

    const updatePrecostingColorwayMappingState = (key: keyof typeof precostingColorwayMappingState, value: any) => {
        setPrecostingColorwayMappingState((prevState) => ({
          ...prevState,
          [key]: value,
        }));
    };
    
    const handleMarketingCostingColorwaysSelect = (index: number,marketingCostingColorwayId: number,marketingCostingColorway: any,preCostingColorway: any,preCostingColorwayId: any) => {
        setCountryColorwaySizeQuantitycombinedState((prevState: any) => {
            const updatedState = { ...prevState };
            const updatedColorwayMapping = [...(updatedState?.colorway_mapping || [])];
            const updatedDataMapping = [...(updatedState?.data || [])];
            
            updatedDataMapping.forEach(country => {
                    country.colorways[index].marketing_costing_colorway_id = marketingCostingColorwayId;
              });

            const existingMappingIndex = updatedColorwayMapping.findIndex(
                (mapping: any) => mapping.pre_costing_colorway_id === preCostingColorwayId
            );
    
            if (existingMappingIndex !== -1) {
                updatedColorwayMapping[existingMappingIndex] = {
                    ...updatedColorwayMapping[existingMappingIndex],
                    marketing_costing_colorway: marketingCostingColorway?.colorway,
                    marketing_costing_colorway_id: marketingCostingColorwayId,
                };
            } else {
                updatedColorwayMapping.push({
                    marketing_costing_colorway: marketingCostingColorway?.colorway,
                    marketing_costing_colorway_id: marketingCostingColorwayId,
                    pre_costing_colorway: preCostingColorway,
                    pre_costing_colorway_id: preCostingColorwayId,
                });
            }

            return {
                ...updatedState,
                colorway_mapping: updatedColorwayMapping,
                data: updatedDataMapping
            };
        });
    };
    
    const handleCountryChange = (event: any) => {
        const {value, checked} = event.target;
        const countryId = parseInt(value);
        const updatedSelectedCountries = [...precostingColorwayMappingState?.selectedOrderCountries];

        if (checked) {
            if (!updatedSelectedCountries.includes(countryId)) {
                const countryName = countryColorwaySizeQuantitycombinedState?.countries?.find((country:any)=>(country?.country_id === countryId))?.country_name || '';
                updatedSelectedCountries.push({country_id: countryId, country_name: countryName});
            }
        } else {
            const indexToRemove = updatedSelectedCountries.findIndex((country:any)=>(country?.country_id === countryId));
            if (indexToRemove !== -1) {
                updatedSelectedCountries.splice(indexToRemove, 1);
            }
        }
        updatePrecostingColorwayMappingState('selectedOrderCountries', updatedSelectedCountries);

        setCountryColorwaySizeQuantitycombinedState((prevState: any) => {
            const updatedData = [...prevState?.data];

            if (checked) {
                const newCountry = countryColorwaySizeQuantitycombinedState?.countries?.find(
                    (country: any) => country?.country_id === countryId
                );

                if (newCountry) {
                    const existingCountry = prevState?.data?.find(
                        (country: any) => country?.colorways?.length > 0
                    );

                    const colorways = existingCountry?.colorways?.map((colorway: any) => ({
                        ...colorway,
                        sizes: colorway?.sizes?.map((size: any) => ({
                            ...size,
                            quantity: 0, 
                        })),
                    })) || [];

                    updatedData.push({
                        country_id: newCountry?.country_id,
                        country_name: newCountry?.country_name,
                        colorways: colorways,
                    });
                }
            } else {
                const indexToRemove = updatedData.findIndex(
                    (country: any) => country?.country_id === countryId
                );
                if (indexToRemove !== -1) {
                    updatedData.splice(indexToRemove, 1);
                }
            }

            return {
                ...prevState,
                data: updatedData,
            };
        });
    };
    
    const handleOnChangeQuantity = (
        countryId: number,
        colorwayId: number,
        sizeId: number,
        newQuantity: number
        ) => {
        setCountryColorwaySizeQuantitycombinedState((prevState: any) => {
            const updatedData = prevState?.data.map((country: any) => {
                if (country?.country_id === countryId) {
                    return {
                        ...country,
                        colorways: country?.colorways.map((colorway: any) => {
                            if (colorway.id === colorwayId) { 
                                return {
                                    ...colorway,
                                    sizes: colorway?.sizes.map((size: any) => {
                                        if (size.id === sizeId) {
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
            return {
                ...prevState,
                data: updatedData,
            };
        });
    };
    
    useEffect(() => {
        existingPrecostingDataFetch()
    }, []);


    const updateNumberOfColorwaysInCombinedState = (countryColorwaySizeQuantitycombinedState: any, newNumberOfColorways: any) => {
        let updatedPayload = { ...countryColorwaySizeQuantitycombinedState };

        const updatedData = updatedPayload.data.map((country: any) => {
        
            const existingColorwaysCount = country?.colorways.length;
            if (newNumberOfColorways > existingColorwaysCount) {
                const additionalColorways = Array.from(
                    { length: newNumberOfColorways - existingColorwaysCount },
                    (value, index) => {
                
                        return {
                            is_new: true,
                            id: `CW ${(parseInt(existingColorwaysCount+(index+1)))}`,
                            name: `CW ${(parseInt(existingColorwaysCount+(index+1)))}`,
                            marketing_costing_colorway_id: null as any,
                            sizes: country.colorways[0]?.sizes.map((size: any) => ({
                                id: size?.id,
                                name: size?.name,
                                order_size_id: size?.order_size_id,
                                quantity: 0 
                            })) || [],
                        };
                    }
                );
                country.colorways = [...country.colorways, ...additionalColorways];
            }
            return country;
        });
    
        type ColorwayMapping = {
            marketing_costing_colorway: string | null;
            marketing_costing_colorway_id: number;
            pre_costing_colorway: string;
            pre_costing_colorway_id: number;
            is_new: boolean;
        };

        const additionalMappings: ColorwayMapping[] = [];
        const existingColorwaysCount = parseInt(updatedPayload?.no_of_colorways);

        for (let i = 0; i < newNumberOfColorways - existingColorwaysCount; i++) {
            const newColorwayName = ((existingColorwaysCount) + (i + 1));
            additionalMappings.push({
                marketing_costing_colorway: null,
                marketing_costing_colorway_id: 0,
                pre_costing_colorway: `CW ${newColorwayName}`,
                pre_costing_colorway_id: `CW ${newColorwayName}` as any,
                is_new:true
            });
        }

        updatedPayload.colorway_mapping = [
            ...updatedPayload.colorway_mapping,
            ...additionalMappings
        ];

        updatedPayload.no_of_colorways = newNumberOfColorways;
        updatedPayload.data = updatedData;
        setCountryColorwaySizeQuantitycombinedState(updatedPayload);
    };

    const deleteColorwayFromCombinedState = (colorwayNameToDelete: string, colorwayId:any) => {
        let updatedPayload = { ...countryColorwaySizeQuantitycombinedState };

        updatedPayload.data = updatedPayload.data.map((country: any) => {
            country.colorways = country?.colorways.filter(
                (colorway: any) => colorway?.id !== colorwayId
            );
            return country;
        }); 

        updatedPayload.colorway_mapping = updatedPayload.colorway_mapping.filter(
            (mapping: any) => mapping.pre_costing_colorway_id !== colorwayId
        );

        updatedPayload.no_of_colorways -= 1;
        setCountryColorwaySizeQuantitycombinedState(updatedPayload);
        if(updatedPayload?.colorway_mapping.length === precostingColorwayMappingState?.numberOfColorways){
            setShowClorwayDeleteIcon(false)
        }
    };

    const handleOnChangeNumInputs = (event:any) => {
        const newValue = event?.target?.value.replace(/[^0-9]/g, '').slice(0, 30);
        updatePrecostingColorwayMappingState("numberOfColorways", parseInt(newValue))
        
        if (newValue > countryColorwaySizeQuantitycombinedState?.colorway_mapping.length) {
            updateNumberOfColorwaysInCombinedState(countryColorwaySizeQuantitycombinedState, newValue);
        }else{
            setShowClorwayDeleteIcon(true)
        }
    };   

    const handleOnChangePreCostingColorwayNameChange = (countryColorwaySizeQuantitycombinedState: any, oldName: string, oldColorwayId:any, event: any) => {
        const newName = event?.target?.value
        let updatedPayload = { ...countryColorwaySizeQuantitycombinedState };
  
        updatedPayload.data = updatedPayload?.data.map((country: any) => {
        country.colorways = country?.colorways.map((colorway: any) => {
            if (colorway?.id === oldColorwayId) {
            return {
                ...colorway,
                name: newName,
            };
            }
            return colorway;
        });
        return country;
        });

        updatedPayload.colorway_mapping = updatedPayload?.colorway_mapping.map((mapping: any) => {
        if (mapping.pre_costing_colorway_id === oldColorwayId) {
            return {
            ...mapping,
            pre_costing_colorway: newName,
            };
        }
        return mapping;
        });
  
        setCountryColorwaySizeQuantitycombinedState(updatedPayload);
    };

    return(
        <>
        {isLoading ? (
            <DefaultLoader />
        ) : (   
        <Card variant="outlined" style={{ padding: '16px' }}>
            <>
                <Typography variant="h6" gutterBottom  sx={{ marginTop: 2 }}>Enter Number of Pre Costing Colorways:</Typography>
                <TextField
                    id="outlined-basic"
                    label=""
                    variant="outlined"
                    value={precostingColorwayMappingState?.numberOfColorways}
                    onInput={handleOnChangeNumInputs}
                />
            </>
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {countryColorwaySizeQuantitycombinedState?.colorway_mapping?.map((colorway: any, colorwayIndex: any) => {
                    return (
                        <Box key={colorwayIndex} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TextField
                                id="outlined-basic"
                                label=""
                                variant="outlined"
                                value={colorway?.pre_costing_colorway}
                                onInput={(event) => handleOnChangePreCostingColorwayNameChange(countryColorwaySizeQuantitycombinedState,colorway?.pre_costing_colorway,colorway?.pre_costing_colorway_id, event)}
                                InputProps={
                                    (showClorwayDeleteIcon )
                                        ? {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        sx={{ borderRadius: '50%' }}
                                                        edge="end"
                                                        color="error"
                                                        onClick={() =>
                                                            deleteColorwayFromCombinedState(colorway?.pre_costing_colorway,colorway?.pre_costing_colorway_id)
                                                        }
                                                    >
                                                        <DeleteOutlineIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }
                                        : {}
                                }
                            />
                        </Box>
                    );
                })}
            </Box>

            {showClorwayDeleteIcon && (
                <Alert sx={{ mt: 2 }} severity="error">
                Please delete extra colorway names
                </Alert>
            )}
            
        </Box>            
            {countryColorwaySizeQuantitycombinedState?.no_of_colorways && (
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
                                {countryColorwaySizeQuantitycombinedState?.colorway_mapping?.map((item: any, index: any) => (
                                    <TableRow  key={item?.id}>
                                        <TableCell>{item?.pre_costing_colorway}</TableCell>
                                        <TableCell>
                                            <Select
                                                id={'marketing_costing_colorway'}
                                                name={'marketing_costing_colorway'}
                                                labelId={'marketing_costing_colorway'}
                                                value={countryColorwaySizeQuantitycombinedState?.colorway_mapping[index]?.marketing_costing_colorway_id || ''}

                                                sx={{ width: '100%' }}
                                                onChange={(event: any) => {
                                                    const marketingCostingColorwayId = event?.target?.value;
                                                    const marketingCostingColorway = countryColorwaySizeQuantitycombinedState?.colorway_mapping?.find(
                                                        (option: any) => option.marketing_costing_colorway_id === marketingCostingColorwayId
                                                    );
                                                    const preCostingColorway = item?.pre_costing_colorway
                                                    const preCostingColorwayId = item?.pre_costing_colorway_id
                                                    handleMarketingCostingColorwaysSelect(index,marketingCostingColorwayId,marketingCostingColorway,preCostingColorway,preCostingColorwayId)
                                                }}
                                            >   
                                                {
                                                    countryColorwaySizeQuantitycombinedState?.colorways?.map((option: any) => (
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

            {countryColorwaySizeQuantitycombinedState?.no_of_colorways && (
                <>
                    <Typography variant="h6" gutterBottom >Select Countries:</Typography>
                    <Card variant="outlined" style={{ padding: '16px' }}>
                        <RitzCheckBox
                            id={'name'}
                            name={'country_name'}
                            isRequired={true}
                            options={countryColorwaySizeQuantitycombinedState?.countries}
                            selectedValues={precostingColorwayMappingState?.selectedOrderCountries}
                            optionValue={'country_id'}
                            optionText={'country_name'}
                            row={true}
                            selectedOptionValue={'country_id'}
                            handleOnChange={handleCountryChange}
                        >    
                        </RitzCheckBox>
                    </Card>
                </>
            )}

            {precostingColorwayMappingState?.selectedOrderCountries && precostingColorwayMappingState?.selectedOrderCountries.length > 0 &&
             (
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
                                {countryColorwaySizeQuantitycombinedState?.data?.map((row:any, rowIndex:any) => {
                                    let countryRowSpan = row.colorways.reduce(
                                        (acc:any, colorway:any) => acc + colorway?.sizes.length,0);
                                    return row.colorways.map((colorway:any, colorwayIndex:number) => {
                                        let colorwayRowSpan = colorway?.sizes.length;
                                        return colorway.sizes.map((size:any, sizeIndex:number) => (
                                            <TableRow key={`${rowIndex}-${colorway?.name}-${sizeIndex}`}>
                                                {colorwayIndex === 0 && sizeIndex === 0 && (
                                                    <TableCell  sx={{ borderRight: "1px solid #ddd", padding: '4px 8px'}} align="center" rowSpan={countryRowSpan}>{row?.country_name}</TableCell>
                                                )}
                                                {sizeIndex === 0 && (
                                                    <TableCell  sx={{ borderRight: "1px solid #ddd", padding: '4px 8px'}} align="center" rowSpan={colorwayRowSpan}>
                                                        {colorway?.name}
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
                                                        selectedValue={size?.quantity}
                                                        handleOnChange={(e:any) =>
                                                            handleOnChangeQuantity(
                                                                row?.country_id,
                                                                colorway?.id,
                                                                size?.id,
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
                <>
                    <Box display="flex" gap={2}>
                        <Button 
                            variant='contained'
                            onClick={() => handlePreCostingEditDetailsSave('onlySave')}
                            >
                            Save
                        </Button>
                        <Button variant='contained' sx={{ mr: 1.5}} onClick={() => verifyAndSave()} {...isSaving && <SaveSpinner/>}>Verified and Save</Button>
                    </Box>
                </>
            }
            </Box>
        </Card>
    )} 
        </>
    )
}
export default PrecostingColorwayMapping
