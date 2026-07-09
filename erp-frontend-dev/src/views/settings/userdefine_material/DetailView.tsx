import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Button, Card, Divider, Grid, IconButton, Link, Typography } from "@mui/material";
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import DefaultLoader from "@/components/DefaultLoader";
import AddAttribute from "./AddAttribute";
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { cadNavigationDetailURL, editMaterialDetailURL } from "@/helpers/constants/front_end/AdminUrls";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import NextLink from 'next/link';
import RitzTable from "@/components/Ritz/RitzTable";
import { TabContext } from "@mui/lab";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";

const MaterialDetail = () => {

    const router = useRouter();
    const materialID = router.query.id;

    const [material, setMaterial] = useState<any>({});
    const [defectModalOpen, setDefectModalOpen] = useState({'modalOpen' : false, 'modalTitle': '', 'defectId': 0});
    const [attributeModalOpen, setAttributeModalOpen] = useState({'modalOpen' : false, 'attributeId': 0});
    const [possibleDefect, setPossibleDefect] = useState({ id: 0, defect: '', active: true});
    const [activeTab, setActiveTab] = useState('1');
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [summaryTabs, setSummaryTabs] = useState(['Attribute Details', 'Possible Defects']);
    const [attribute, setAttribute] = useState<any>({ category: '', material: '', consumption_measurement_unit:'' });
    const [measuringUnits, setMeasuringUnits] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const categoryoptions = [
        { "id": 'sewing_trim', "name": "Sewing" },
        { "id": 'packaging_trim', "name": "Packaging" },
        { "id": 'fabric', "name": "Fabric" },
    ];

    const handleDefectModalClose = () => {
        setDefectModalOpen({'modalOpen' : false, 'modalTitle': '', 'defectId': 0})
    }

    const toggleAttributeModal = (attributeID: any) => {
        setAttributeModalOpen({'modalOpen' : true, 'attributeId': attributeID})
    };

    const handleattributeModalClose = () => {
        setAttributeModalOpen({'modalOpen' : false, 'attributeId': 0})
    };

    const togglePossibleDefectModal = (title: any, defectId: number) => {
        setDefectModalOpen({ 'modalOpen': true, 'modalTitle': title, 'defectId': defectId});
        if (defectId === 0) {
            setPossibleDefect({ id: 0, defect: "", active: true });
        } else {       
            setIsModalLoading(true);
            api.get(RestUrls.getMaterialDefectURL(defectId)).then(resp => {
                const reseditdata = resp?.data || {};
                setPossibleDefect({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    } 

    const getData = () => {
        setIsLoading(true);

        Promise.all([
            api.get(RestUrls.getMaterialDetailURL(+materialID)),
            api.get(RestUrls.getDefaultMeasuringUnitsURL())
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [material, units] = respData;
            setMaterial(material);
            setAttribute({
                category: material.category || '', 
                material: material.material || '', 
                consumption_measurement_unit: material.consumption_measurement_unit || ''
            });
            setMeasuringUnits(units || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleSave = () => {
        setIsSaving(true);
        const defectData = {
            'id': possibleDefect.id,
            'defect': possibleDefect.defect,
            'active': possibleDefect.active,
            'material': materialID
        };

        const request = {
            method: defectModalOpen.defectId === 0 ? 'post' : 'put',
            url: defectModalOpen.defectId === 0 ? RestUrls.createMaterialDefectURL() : RestUrls.updateeMaterialDefectURL(defectModalOpen.defectId),
            data: defectData
        }

        api(request).then(() => {
            setDefectModalOpen({ 'modalOpen': false, 'modalTitle': '', 'defectId': 0});
            getData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    }

    const handleChangeTabs = (event: string) => {
        setActiveTab(event);
        // const url = {
        //     pathname: router.pathname,
        //     query: { ...router.query, tab: event }
        // }
        // router.replace(url, undefined, { shallow: true });
    };

    const handleChange = (event: any) => {
        setPossibleDefect({
            ...possibleDefect,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setPossibleDefect({
            ...possibleDefect,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Defect Name', name: 'defect', value: possibleDefect?.defect || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: possibleDefect?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    useEffect(() => {
        if (materialID) {
            getData();
        }
    }, [materialID]);

    // useEffect(() => {
    //     const { tab } = router.query;
    //     if (tab) {
    //         setActiveTab(tab.toString());
    //     }
    // }, [router]);
    

    return (
        isLoading ? <DefaultLoader /> : (
            <>
                <RitzBreadcrumbs
                    items={[
                        { url: '/admin/material_types/materials', label: 'Material List' },
                        { label: 'Material Details' }
                    ]}
                    title={material?.material}
                />

                <Card variant='outlined' sx={{ mb: 2 }}>
                    <Grid container columnSpacing={2} px={2}>
                        <Grid item sm={2} xs={2}>
                            <dl>
                                <dt>Material</dt>
                                <dd>{attribute?.material || '--'}</dd>
                            </dl>
                        </Grid>
                        <Divider orientation='vertical' variant='middle' flexItem />
                        <Grid item sm={2} xs={2}>
                            <dl>
                                <dt style={{ marginTop: 5 }}>Category Type</dt>
                                <dd>{categoryoptions.find((i: any) => i.id === attribute?.category)?.name || '--'}</dd>
                            </dl>
                        </Grid>
                        <Divider orientation='vertical' variant='middle' flexItem />
                        <Grid item sm={2} xs={2}>
                            <dl>
                                <dt>Measuring Unit</dt>
                                <dd>{measuringUnits.find((i: any) => i.id === attribute?.consumption_measurement_unit)?.name || '--'}</dd>
                            </dl>
                        </Grid>
                        <Divider orientation='vertical' variant='middle' flexItem />
                        <Grid item sm={2} xs={2}>
                            <dl>
                                <dt>Display Order</dt>
                                <dd>{material?.display_order || '--'}</dd>
                            </dl>
                        </Grid>
                        <Divider orientation='vertical' variant='middle' flexItem />
                        <Grid item >
                            <dl>
                                <dt>Estimated Consumption Ratio Units</dt>
                                <dd>{material?.estimated_consumption_ratio_units || '--'}</dd>
                            </dl>
                        </Grid>

                    </Grid>
                </Card>
                <TabContext value={activeTab}>
                <RitzTabs
                    tabs={summaryTabs}
                    activeTab={activeTab}
                    emitChange={handleChangeTabs}
                />
                <RitzTabPanel value='1'>
                {isLoading ? (
                        <DefaultLoader />
                    ) : (
                        <>
                        <Box sx={{ mb: 3 }}>
                        <Typography>
                            <Button variant='outlined' onClick={() => { toggleAttributeModal(0) }} >Add Attributes</Button>
                        </Typography>
                        </Box>
                        <RitzTable
                        columns={[
                            {
                                accessorKey: 'name',
                                header: 'Name',
                                cell: (props: any) => <Link component={NextLink} href={editMaterialDetailURL(+materialID, props?.row?.original?.id)}>{props?.row?.original?.name}</Link>
                            },
                            {
                                accessorKey: 'label',
                                header: 'Label'
                            },
                            {
                                accessorKey: 'attribute_type',
                                header: 'Type'
                            },
                            {
                                header: 'Status',
                                accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
                            },
                            {
                                header: 'Is Variation',
                                accessorFn: (row: any) => row['is_material_variation'] ? ACTIVE_STATUS : INACTIVE_STATUS
                            },
                            {
                                header: 'Po Editable',
                                accessorFn: (row: any) => row['po_editable'] ? ACTIVE_STATUS : INACTIVE_STATUS
                            },
                            {
                                header: 'Is Required',
                                accessorFn: (row: any) => row['mandatory'] ? ACTIVE_STATUS : INACTIVE_STATUS
                            }
                        ]}
                        data={material.userdefinedmaterialattribute_set || []}
                        border={false}
                        title='Attribute Information'
                        />
                        </>
                    )}
                </RitzTabPanel>
                <RitzTabPanel value='2'>
                    <Box sx={{ mb: 3 }}>
                        <Typography>
                            <Button variant='outlined' onClick={() => { togglePossibleDefectModal('Create New Defect', 0) }} >Add Defect</Button>
                        </Typography>
                    </Box>
                    <RitzTable
                        columns={[
                            {
                                accessorKey: 'defect',
                                header: 'Defect'
                            },
                            {
                                header: 'Status',
                                accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
                            },
                            {
                                accessorKey: "id",
                                header: 'Edit',
                                enableSorting: false,
                                enableColumnFilter: false,
                                enableGlobalFilter: false,
                                cell: (props: { getValue: () => any; }) => (
                                    <IconButton size='small' color='primary' onClick={() => togglePossibleDefectModal("Edit Existing Defect", props.getValue())}>
                                        <EditIcon fontSize='inherit' />
                                    </IconButton>
                                ),
                                meta: {
                                    align: 'center',
                                    width: 100
                                }
                            }
                        ]}
                        data={material.userdefinedmaterialdefect_set || []}
                        border={false}
                        title='Possible Defects Information'
                    />
                </RitzTabPanel>
                </TabContext>
                {attributeModalOpen.modalOpen && (
                    <AddAttribute
                        open={open}
                        onClose={handleattributeModalClose}
                        attributeId={attributeModalOpen.attributeId}
                        materialId={materialID}
                        material={material}
                        refreshData={getData}
                    />
                )}
                {defectModalOpen.modalOpen && (
                    <RitzModal open={defectModalOpen.modalOpen} onClose={handleDefectModalClose} title={defectModalOpen.modalTitle}>
                          <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={defectModalOpen.defectId} errors={errors} isSaving={isSaving} />
                    </RitzModal>
                )}                  
            </>
        )
    );
};

export default MaterialDetail;
