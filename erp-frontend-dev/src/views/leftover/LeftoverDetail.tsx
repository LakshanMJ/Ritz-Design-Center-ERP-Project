import { Alert, Box, Breadcrumbs, Button, Card, darken, Divider, Grid, IconButton, Link, List, ListItem, ListItemIcon, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react'
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import DefaultLoader from '@/components/DefaultLoader';
import { useRouter } from "next/router";
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import RitzModal from '@/components/Ritz/RitzModal';
import CircularLoader from '@/components/CircularLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { leftoverVerificationMaterialListURL, leftoverVerificationStateChangeURL } from '@/helpers/constants/rest_urls/GrnUrls';
import EditIcon from '@mui/icons-material/Edit';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import ErrorIcon from '@mui/icons-material/Error';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import EditRollDetails from './EditRollDetails';
import EditLeftoverVerificationState from './EditLeftoverVerificationState';
import { COMPLETE_STATE, IN_PROGRESS_STATE, PENDING_STATE } from '@/helpers/constants/LeftoverVerificationStates';
import SaveSpinner from '@/components/SaveSpinner';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { MERCHANT_ADMIN } from '@/helpers/constants/RoleManager';
import CircleIcon from '@mui/icons-material/Circle';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const LeftoverDetail = ({ verificationId }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const stateModalTitle = 'Select any leftover verification state'
    const [isLoading, setIsLoading] = useState(true)
    const [openEditModal, setOpenEditModal] = useState(false)
    const [selectedRowData, setSelectedRowData] = useState({})
    const [selectedMaterialType, setSelectedMaterialType] = useState(null)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false)
    const [openStateModal, setOpenStateModal] = useState(false);
    const [errorsModalOpen, setErrorsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false)
    const [errors, setErrors] = useState<any>([]);
    const [leftoverDetails, setLeftoverDetails] = useState<any>({});
    const canEdit = hasRole(MERCHANT_ADMIN);

    const updatedMaterialColumns = [{
        accessorKey: "id",
        header: '',
        cell: ({ row }: any) => (
            <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                        size="small"
                        onClick={() => handleRowExpand(row)}
                        style={{ cursor: "pointer" }}
                    >
                        {row.getIsExpanded() ? (
                            <KeyboardArrowDownIcon />
                        ) : (
                            <KeyboardArrowRightIcon />
                        )}
                    </IconButton>
                </Box>
            </span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        meta: {
            align: "left",
        },
    },
    {
        accessorKey: "attributes.material_label",
        header: 'Material',
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
    },
    {
        accessorKey: "attributes.ritz_customer_brand_reference_code",
        header: 'Ritz Reference Code',
        cell: (props: any) => {
            const material = props.row.original.attributes.ritz_customer_brand_reference_code
            const materialDetails = props.row.original.attributes
            const materialHeaders = props.row.original.headers
            return (
                <> {material} <RitzToolTip materialHeaders={materialHeaders} materialDetails={materialDetails} /> </>
            );
        },
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
    }, {
        accessorKey: "attributes.material_definition_attributes.fabric_texture_description_display_value",
        header: 'Material Reference Code',
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
    },
    ]

    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const fetchDetails = () => {
        const requests = [
            api.get(leftoverVerificationMaterialListURL(verificationId)),
        ]
        Promise.all(requests).then(response => {
            const [verificationData] = response.map((r: any) => r.data);
            setLeftoverDetails({...verificationData})

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingCircularLoader(false);
        });
    }


    const handleErrorsDialogClose = () => {
        setErrors([]);
        setErrorsModalOpen(false);
    }
    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.rolls || [];
        return subRows.length > 0;
    };

    const handleEditRoll =(rollData: any, materialType: any)=>{
        setSelectedRowData({...rollData})
        setSelectedMaterialType(materialType)
        setOpenEditModal(true)
    }

    const renderSubRow = ({ row }: any) => {
        const rollDetails = row?.original?.rolls;
        return (
            <>
                <Table
                    size="small"
                    sx={{
                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                        '& .MuiTableCell-head': {
                            color: (theme) => theme.palette.grey[700],
                            background: (theme) => theme.palette.grey[50],
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Barcode</TableCell>
                            <TableCell>Available Quantity</TableCell>
                            <TableCell>Actual Quantity</TableCell>
                            {row?.original?.attributes?.material_type == 'fabric' && (
                                <>
                                    <TableCell>Shade</TableCell>
                                    <TableCell>Swatch</TableCell>
                                </>
                            )}
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rollDetails?.map((roll: any, rollIndex: any) => (
                            <TableRow
                                sx={{
                                    '&:last-child td, &:last-child th': {
                                        border: 0,
                                    },
                                    marginTop: '10px',
                                    marginBottom: '10px'
                                }}
                                key ={rollIndex}
                            >
                                <TableCell >{roll?.barcode}</TableCell>
                                <TableCell >{roll?.available_quantity} {roll?.available_quantity_units_display}</TableCell>
                                <TableCell >{roll?.usable_quantity} {roll?.available_quantity_units_display}</TableCell>
                                {row?.original?.attributes?.material_type == 'fabric' && (
                                    <>
                                        <TableCell >{roll?.shade?.shade_name}</TableCell>
                                        <TableCell > {roll?.shade?.attachment?.file_path && (
                                            <img
                                                src={roll?.shade?.attachment?.file_path}
                                                alt="Preview"
                                                style={{ width: '100%', maxWidth: '80px', height: '80px', objectFit: 'cover' }}
                                            />)}
                                        </TableCell>
                                    </>
                                )}
                                <TableCell >
                                    <IconButton sx={{px: 1 }} size="small" color="primary" disabled={leftoverDetails?.inhouse_material_verification?.state == PENDING_STATE} onClick={() => handleEditRoll(roll, row?.original?.attributes?.material_type)}>
                                        <EditIcon fontSize="inherit" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                    </TableBody>
                </Table>

            </>
        )
    }

    const handleChangeState =(state: any)=>{
        setIsSaving(true)
        const request = {
            method: 'post',
            url: leftoverVerificationStateChangeURL(verificationId),
            data: {
                new_state: state,
                plant_warehouse_id: leftoverDetails?.inhouse_material_verification?.warehouse_id
            }
        };
        api(request).then((resp) => {
            const resdata = resp?.data || [];
            toast.success(DEFAULT_SUCCESS);
            fetchDetails()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleSavedData = () => {
        setOpenStateModal(false)
        fetchDetails()
    }

    const handleRollSavedData = () => {
        setOpenEditModal(false)
        fetchDetails()
    }

    const getDetailPageURL = (frontEndURL: string) => {
        router.push(`/${frontEndURL}`);
      };

    useEffect(() => {
        if (verificationId > 0) {
            fetchDetails()
        }
    }, [verificationId])

    return (
        <>
            {openEditModal && (
                <RitzModal open={openEditModal} onClose={() => setOpenEditModal(false)} title={"Edit Roll Details"} maxWidth='lg' >
                    <EditRollDetails selectedRowData={selectedRowData} verificationId={verificationId} selectedMaterialType={selectedMaterialType} handleSavedData={handleRollSavedData}/>
                </RitzModal>
            )}
            {openStateModal && (
                <RitzModal open={openStateModal} onClose={() => setOpenStateModal(false)} title={stateModalTitle}>
                    <EditLeftoverVerificationState verificationId={verificationId} currentState={leftoverDetails?.inhouse_material_verification?.state} currentPlant={leftoverDetails?.inhouse_material_verification?.warehouse_id} setChanged={handleSavedData} />
                </RitzModal>
            )}
            {errorsModalOpen && (
                <RitzModal open={errorsModalOpen} onClose={handleErrorsDialogClose} title='Operation Failed'>
                    Please fix the issues below to continue this stage.
                    <Divider sx={{ mt: 2, mb: 3 }} />
                    <Box>
                        {errors?.map((errorItem: string, index: number) => (
                            <Grid container spacing={1} key={`${keyHelper.getNextKeyValue()}`}>
                                <Grid item>
                                    <ErrorIcon style={{ verticalAlign: 'middle', color: 'red', fontSize: 'medium' }} />
                                </Grid>
                                <Grid item xs={11}>
                                    <Box>{errorItem}</Box>
                                </Grid>
                            </Grid>
                        ))}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="outlined" color='secondary' onClick={handleErrorsDialogClose}>Close</Button>
                    </Box>
                </RitzModal>
            )}
            {isLoadingCircularLoader && (<CircularLoader />)}

            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ mb: 1.5 }}
            >
                <Link underline='hover' color='inherit' component={NextLink} href={'/material_verification'}>Material Verification Dashboard</Link>
                <Typography color='text.primary'>Material Verification Details</Typography>
            </Breadcrumbs>

            <Typography variant='h1'>Material Verification Details</Typography>
            {canEdit && (
                <Button variant='outlined' onClick={() => { setOpenStateModal(true) }} sx={{ mr: 1.5, mb: 2 }}>Edit Information</Button>
            )}
            {leftoverDetails?.inhouse_material_verification?.state == PENDING_STATE && (
                <Button variant='outlined' onClick={() => { handleChangeState(IN_PROGRESS_STATE) }} sx={{ mr: 1.5, mb: 2 }}> {isSaving && <SaveSpinner/>}Start Work</Button>
            )}
            {leftoverDetails?.inhouse_material_verification?.state == IN_PROGRESS_STATE && (
                <Button variant='outlined' onClick={() => { handleChangeState(COMPLETE_STATE) }} sx={{ mr: 1.5, mb: 2 }}>{isSaving && <SaveSpinner/>}Complete</Button>
            )}
            {leftoverDetails?.inhouse_material_verification?.state == PENDING_STATE && (
                <Box sx={{ width: '50%' }}>
                    <Alert severity="info">
                        Please click the "Start Work" button to proceed with the next step.
                    </Alert>
                </Box>
            )}
           

            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box>
                        <Card variant="outlined" sx={{ mb: 3, mt: 3 }}>
                            <Box sx={{ p: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>Leftover Verification No:</Typography>
                                            <Typography>{leftoverDetails?.inhouse_material_verification?.display_number || '--'}</Typography>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>PO Club:</Typography>
                                            <List>
                                                {leftoverDetails?.inhouse_material_verification?.po_clubs?.map((club:any) => (
                                                    <ListItem key={club.id}>
                                                        <CircleIcon fontSize='inherit' color='primary'  sx={{ mr: 2}} />
                                                        <Link target="_blank" component={NextLink} href={purchaseOrderClubDetailsPageURL(club.id)}>
                                                            <Typography>{club.display_number}</Typography>
                                                        </Link>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>State</Typography>
                                            <Typography>
                                                {leftoverDetails?.inhouse_material_verification?.state_display || '--'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                    <Grid item xs={12} sm={16} md={3}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>Plant</Typography>
                                            <Typography>
                                                {leftoverDetails?.inhouse_material_verification?.plant_name || '--'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>Warehouse</Typography>
                                            <Typography>
                                                {leftoverDetails?.inhouse_material_verification?.warehouse_name || '--'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>Verification Type</Typography>
                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                <Typography>
                                                    {leftoverDetails?.verification_type || '--'}
                                                </Typography>
                                                <OpenInNewIcon
                                                    sx={{ position: 'relative', top: '0px', ml: 2, color: 'rgb(25, 118, 210)', cursor: 'pointer' }}
                                                    onClick={() => {getDetailPageURL(leftoverDetails?.frontend_url)}} />
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem  sx={{mt:2}}/>
                                </Grid>
                            </Box>
                        </Card>
                    </Box>
                    <Box>
                        <RitzTable
                            columns={updatedMaterialColumns}
                            data={leftoverDetails?.data}
                            getRowCanExpand={getRowCanExpand}
                            renderSubComponent={renderSubRow}
                            pagination={false}
                        />
                    </Box>
                </>
            )}

        </>
    );
}

export default LeftoverDetail