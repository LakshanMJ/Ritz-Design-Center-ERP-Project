import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, CardHeader, Checkbox, Grid, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/router";
import * as restUrls from "@/helpers/constants/RestUrls";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { PENDING_SUPPLIER_SELECTION_VERSION_STATE } from "@/helpers/constants/CostingStates";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import SaveSpinner from "@/components/SaveSpinner";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";

const BomPackDetails = ({ clubId, filterData, filteredPackIds  }: any) => {

    const router = useRouter();
    const [navigation, setNavigation] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [poBomPackDetails, setPoBomPackDetails] = useState({ pack_item_ids: [...filteredPackIds.pack_item_ids], pack_ids: [...filteredPackIds.pack_ids] });

    const fetchData = () => {
        api.get(poUrls.poClubingBomNavagationURl(clubId)).then(resp => {
            const respData = resp?.data || {};
            setNavigation(respData);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleOrderPackEditOnClick = (poPackItemId: number) => {
        setPoBomPackDetails((prevState) => {
            const { pack_item_ids } = prevState;
            if (pack_item_ids.includes(poPackItemId)) {
                return { ...prevState, pack_item_ids: pack_item_ids.filter((id) => id !== poPackItemId) };
            } else {
                return { ...prevState, pack_item_ids: [...pack_item_ids, poPackItemId] };
            }
        });
    }

    const handleMaterialPackagingOnClick = (packId: number) => {
        setPoBomPackDetails((prevState) => {
            const { pack_ids } = prevState;
            if (pack_ids.includes(packId)) {
                return { ...prevState, pack_ids: pack_ids.filter((id) => id !== packId) };
            } else {
                return { ...prevState, pack_ids: [...pack_ids, packId] };
            }
        });
    }

    const handleCheckedPackItemValue = (packitemId: number) => {
        return packitemId && poBomPackDetails.pack_item_ids.includes(packitemId);
    };

    const handleCheckedPackValue = (packId: number) => {
        return packId && poBomPackDetails.pack_ids?.includes(packId);
    };

    const handleFilterData = () => {
        setIsSaving(true)
        const request = {
            method: 'post',
            url: poUrls.purchaseOrderClubingBomMaterialsFilterURL(clubId),
            data: { ...poBomPackDetails }
        };

        api(request).then((resp) => {
            const resdata = resp?.data
            filterData(resdata)
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));

        }).finally(() => setIsSaving(false));
    }

    const handleClickSelectAllCheckbox = (poIndex: any, packIndex: any, poId: any, packId: any) => {
        const selectedPack = navigation[poIndex].pack_details[packIndex].po_pack_items;
        const selectedPackItemIds = selectedPack.map((packItem: any) => packItem.po_pack_item_id);
        setPoBomPackDetails((prevDetails) => {
            const { pack_ids, pack_item_ids } = prevDetails;
            if (pack_ids.includes(packId)) {
                return {
                    ...prevDetails,
                    pack_ids: pack_ids.filter((id) => id !== packId),
                    pack_item_ids: pack_item_ids.filter((itemId) => !selectedPackItemIds.includes(itemId)),
                };
            } else {
                return {
                    ...prevDetails,
                    pack_ids: [...pack_ids, packId],
                    pack_item_ids: [...pack_item_ids, ...selectedPackItemIds],
                };
            }
        });
    };

    useEffect(() => {
        if (clubId) {
            fetchData();
        }
    }, [clubId]);

    return (
        <>{isLoading ? <DefaultLoader /> :
            <Stack>
                {navigation?.map((purchaseOrder: any, index: number) => (
                    <Box sx={{ marginBottom: 2 }} key={index}>
                        <Typography variant="h6" sx={{ marginBottom: '5px' }}>{purchaseOrder.po_name}</Typography>
                        <Grid container spacing={2}>
                            {purchaseOrder.pack_details?.map((po_pack: any, packIndex: number) => (
                                <Grid item xs={4} key={`${index}_${po_pack.po_pack_id}`}>
                                    <Card variant='outlined' key={`${index}_${po_pack.po_pack_id}`}>
                                        <CardHeader
                                            sx={{
                                                py: 1,
                                                backgroundColor: (theme) => theme.palette.grey[50]
                                            }}
                                            titleTypographyProps={{
                                                variant: 'h6',
                                                fontWeight: 600
                                            }}
                                            title={
                                                <Box display="flex" alignItems="center">
                                                    <Checkbox onClick={() => handleClickSelectAllCheckbox(index, packIndex, purchaseOrder.id, po_pack.po_pack_id)}  checked={handleCheckedPackValue(po_pack?.po_pack_id)} />
                                                    <Box> {po_pack?.po_country} - {po_pack?.po_colorway} - {po_pack?.po_size} Pack</Box>
                                                </Box>
                                            }
                                        />
                                        <CardContent>
                                            {po_pack?.po_pack_items?.map((po_item: any, packItemIndex: number) => (
                                                <Box key={`${index}_${po_pack.po_pack_id}_${packItemIndex}`}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Checkbox
                                                                onClick={() => handleOrderPackEditOnClick(po_item?.po_pack_item_id)}
                                                                checked={handleCheckedPackItemValue(po_item?.po_pack_item_id)}
                                                            />
                                                            <Box sx={{ pl: 1 }}>
                                                                {po_item?.po_item_name} ({po_item.po_pack_item_colorway_category})
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            ))}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Checkbox
                                                        onClick={() => handleMaterialPackagingOnClick(po_pack?.po_pack_id)}
                                                        checked={handleCheckedPackValue(po_pack?.po_pack_id)}
                                                    />
                                                    <Box sx={{ pl: 1 }}>Packaging</Box>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <Button sx={{ float: 'right', ml: 2 }} variant='contained' disabled={isSaving} onClick={handleFilterData} >{isSaving && <SaveSpinner />}Filter</Button>
                </Box>
            </Stack>

        }</>
    );
};

export default BomPackDetails;