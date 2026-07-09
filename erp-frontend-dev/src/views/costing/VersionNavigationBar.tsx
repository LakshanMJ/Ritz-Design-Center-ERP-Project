import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    IconButton,
    MenuItem,
    Select,
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import api from "@/services/api";
import * as RestUrls from '../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import DefaultLoader from "@/components/DefaultLoader";
import { useRouter } from "next/router";
import {orderSummaryVersionURL} from "@/helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const VersionNavigationBar = ({ orderId, versionId }: any) => {

    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [version, setVersion] = useState<any>({});
    const [editVersionId, setEditVersionId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [versions, setVersions] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleChange = (event: any) => {
        setVersion({
            ...version,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields: any[] = [
        { label: 'Version Name', name: 'name', value: version?.name || '', type: 'text', onChange: handleChange },
    ];

    const modalOpen = (title: string, versionId: any) => {
        setTitle(title);
        setOpen(true);

        if (versionId === 0) {
            setVersion({ version: 0, name: '' });
        } else {
            setEditVersionId(versionId);
            setIsModalLoading(true);

            api.get(RestUrls.updateDetailVersionURL(orderId, versionId)).then(resp => {
                const reseditdata = resp?.data || {};
                setVersion({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getVersions = () => {
        setIsLoading(true);
        api.get(RestUrls.varsionsURL(orderId)).then(resp => {
            const resdata = resp?.data || [];
            setVersions([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (orderId) {
            getVersions();
        }
    }, [orderId]);

    useEffect(() => {
        if (versionId) {
            setEditVersionId(versionId);
        }
    }, [versionId]);


    const handleOnChange = (event: any) => {
        const versionId = event.target.value;
        setEditVersionId(versionId);
        router.push(orderSummaryVersionURL(orderId, versionId));
    }

    const handleSave = () => {
        setIsSaving(true);

        const versionData = {
            order: orderId,
            name: version.name,
            version: version.id,
        }
        const request = {
            method: editVersionId === 0 ? 'post' : 'put',
            url: editVersionId === 0 ? RestUrls.createVersionURL(orderId) : RestUrls.updateDetailVersionURL(orderId,editVersionId),
            data: versionData
        };

        api(request).then(() => {
            setOpen(false);
            getVersions();
        }).catch(error => {
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    };



    return (
        <>
            <Card variant='outlined'>
                {isLoading ? (
                    <DefaultLoader />
                ) : (
                    <>
                        <CardHeader
                            title={"Select a version"}
                            titleTypographyProps={{
                                variant: 'h6',
                                fontWeight: 'normal'
                            }}
                            action={
                                <Button
                                    variant="text" 
                                    onClick={() => {
                                        modalOpen("Create New Version", 0);
                                    }}
                                >
                                    <AddIcon fontSize="small" />Add Version
                                </Button>
                            }
                            sx={{ py: 1.5 }}
                        >
                        </CardHeader>
                        <CardContent sx={{ py: 0, display: 'flex'}}>
                            <Box sx={{ display: 'flex', width: '100%' }}>
                                <Select
                                    fullWidth
                                    value={versionId}
                                    onChange={handleOnChange}
                                >
                                    {versions.map((version: any, i: number) => (
                                        <MenuItem key={i} value={version.id}>{version.name}</MenuItem>
                                    ))}
                                </Select>
                                <IconButton
                                    sx={{ ml: 1, px: 1.5 }}
                                    size="small"
                                    color="primary"
                                    onClick={() => modalOpen('Edit Version', editVersionId)}
                                >
                                    <EditIcon fontSize="inherit" />
                                </IconButton>
                            </Box>
                        </CardContent>
                    </>
                )}
            </Card>

            <RitzModal
                open={open}
                onClose={modalClose}
                title={title}
                isLoading={isModalLoading}
            >
                <RitzGenericForm
                    fields={formFields}
                    onSumbit={handleSave}
                    submitId={editVersionId}
                    errors={errors}
                    isSaving={isSaving}
                />
            </RitzModal>
        </>
    );
};

export default VersionNavigationBar;
