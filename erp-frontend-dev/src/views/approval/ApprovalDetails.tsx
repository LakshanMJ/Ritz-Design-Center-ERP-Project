import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box, Button, Card, CardContent, Divider, Grid, IconButton, InputLabel, Link, List, TextareaAutosize, Tooltip, Typography } from '@mui/material';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from "next/router";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SaveIcon from '@mui/icons-material/Save';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import api from '@/services/api';
import { approvalDetailURL, approvalStatusListURL, approvalCommentDeleteURL, approvalCommentSaveURL, approvalStateChangeURL, usersURL, approvalDetailsSaveURL } from '@/helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import CircleIcon from '@mui/icons-material/Circle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import CircularLoader from '@/components/CircularLoader';
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';
import {MERCHANT_ADMIN} from "@/helpers/constants/RoleManager";
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { entityURL } from '@/helpers/taskEntities/EntityUrls';


const ApprovalDetails = ({ approvalId, approvalType }: any) => {
  const router = useRouter();
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingChoices, setIsSavingChoices] = useState(false); 
  const keyHelper = new ReactKeyHelper();
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [approvalDetails, setApprovalDetails] = useState<any>({});
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedUsers, setSelectedUsers] = useState<any>([]);
  const [approvalStatus, setApprovalStatus] = useState<any>([]);
  const [approvalComment, setApprovalComment] = useState<any>("");
  const canEdit = hasRole(MERCHANT_ADMIN);

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    router.replace(url, undefined, { shallow: true });
  };

  const fetchData = () => {
    const requests = [
      api.get(usersURL()),
      api.get(approvalDetailURL(approvalId)),
      api.get(approvalStatusListURL()),

    ];

    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [users, approvalDetails, approvalStatus] = respData;
      setUsers(users)
      setApprovalDetails({ ...approvalDetails })
      setApprovalStatus([...approvalStatus])
      const assignedUserIds = approvalDetails.assigned_users.map((user: any) => user.id);
      setSelectedUsers([...assignedUserIds])

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false),
      setIsLoadingCircularLoader(false)
    });
  };

  const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
    data.forEach((d: any) => d.size = d.id);
    const userIds = data.map((size: any) => size.id);
    setSelectedUsers(userIds);
  }

  const handleSaveComments = () => {
    if (approvalComment !== '') {
      setIsSavingComment(true)
      setIsLoadingCircularLoader(true);
      api.post(approvalCommentSaveURL(approvalId), { comment: approvalComment }).then(resp => {
        toast.success(DEFAULT_SUCCESS);
        fetchData()
        setApprovalComment("")
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsSavingComment(false));
    }
  }
  const handleDeleteComment = (commentId: any) => {
    setIsLoadingCircularLoader(true);
    setIsSavingComment(true)
    api.delete(approvalCommentDeleteURL(commentId)).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSavingComment(false));

  }
  const handleChoicesChange = (choice: any) => {
    setIsSavingChoices(true)
    setIsLoadingCircularLoader(true);
    api.post(approvalStateChangeURL(approvalId), { approval_status: choice }).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSavingComment(false));

  }

  const handleChangeApprovalComment = (event: any)=>{
    setApprovalComment(event.target.value)
  }

  const handleChangeState = (event: any) => {
    setApprovalDetails((prevState: any) => ({
      ...prevState,
      action: event.target.value
    }));
  };

  const getColorForUser = (userId: number) => {
    return ColorHelper[userId % ColorHelper.length];
  };

  const handleSaveAdminChanges =()=>{
    const saveData = {
      assign_users: selectedUsers,
      action: approvalDetails.action
    }
    api.post(approvalDetailsSaveURL(approvalId), saveData).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSavingComment(false));

  }
  const getDetailPageURL = (frontEndURL: string) => {
    router.push(`/${frontEndURL}`);
  };
  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  useEffect(() => {
    if (approvalId) {
      fetchData()
    }
  }, [approvalId]);

  return (
    <>
      {isLoadingCircularLoader && (<CircularLoader />)}

      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <RitzBreadcrumbs
            items={[
              { label: 'Approval List', url: approvalType=='my_approval'? '/tasks/my_approvals':'/tasks/all_approvals' },
              { label: 'Approval Details' },
            ]}
            title={"Approval Details"}
          />

          <Box sx={{ width: '100%', typography: 'body1' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: { xs: 1, sm: 2 },
                }}
              >
                {canEdit &&(
                  <Button variant="outlined" onClick={() => { handleSaveAdminChanges() }} ><SaveIcon sx={{ mr: 1 }} />Save</Button>
                )}
                {approvalDetails?.action == 'pending' && (
                  <>
                    <Button variant="outlined" onClick={() => { handleChoicesChange('canceled') }}>
                      <HighlightOffIcon sx={{ mr: 1 }} />Cancel
                    </Button>
                    <Button variant="outlined" onClick={() => { handleChoicesChange('rejected') }}>
                      <ThumbDownOffAltIcon sx={{ mr: 1 }} />Reject
                    </Button>
                    <Button variant="outlined" onClick={() => { handleChoicesChange('approved') }}>
                      <DoneAllIcon sx={{ mr: 1 }} />Approved
                    </Button>
                  </>
                )}
              </Box>
            <TabContext value={activeTab}>
              <Box sx={{ display: 'flex', alignItems: 'center', }}>
                <RitzTabs tabs={['Approved Details']} activeTab={activeTab} emitChange={handleChangeTabs} />
              </Box>
              <RitzTabPanel value='1' sx={{ pt: 2 }}>
                    <Grid container columnSpacing={2}>
                      <Grid item sm={2} xs={4}>
                        <Typography sx={{ fontWeight: 'bold' }}>Approval No:</Typography>
                        <Typography >{approvalDetails?.display_number}</Typography>
                      </Grid>
                      <Divider orientation="vertical" flexItem />
                      <Grid item sm={3} xs={4}>
                        <Typography sx={{ fontWeight: 'bold' }}>Approval Type:</Typography>
                        <Typography >{approvalDetails?.approval_name_display}</Typography>
                      </Grid>
                      <Divider orientation="vertical" flexItem />
                      <Grid item sm={2} xs={4}>
                        <Typography sx={{ fontWeight: 'bold' }}>Created Date:</Typography>
                        <Typography >{approvalDetails?.created}</Typography>
                      </Grid>
                      <Divider orientation="vertical" flexItem />
                      <Grid item sm={2} xs={4}>
                        <Typography sx={{ fontWeight: 'bold' }}>Action:</Typography>
                        <Typography >{approvalDetails?.action_display} {approvalDetails?.action !='pending' && `(${approvalDetails?.action_user?.user_name_display})`} </Typography>
                      </Grid>
                      <Divider orientation="vertical" flexItem />
                      <Grid item sm={2} xs={4}>
                        <Typography sx={{ fontWeight: 'bold' }}>Action Date:</Typography>
                        <Typography >  {approvalDetails?.action_date || '--'}</Typography>
                      </Grid>
                    </Grid>
                    <Divider sx={{ p:2}}/>
                    <Box sx={{ mt: 3 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Box>
                            <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>State :</InputLabel>
                          </Box>
                          <Box>
                            <RitzSelection
                              id={'state'}
                              name={'state'}
                              optionValue={'id'}
                              optionText={'name'}
                              selectedValue={approvalDetails.action}
                              isRequired={true}
                              options={approvalStatus}
                              handleOnChange={handleChangeState}
                              isReadOnly={!canEdit}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box>
                            <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Assigned Users :</InputLabel>
                          </Box>
                          <Box>
                            <RitzMultiSelectCheckBox
                              id={'users'}
                              selectOptions={users}
                              optionValue={'id'}
                              optionDisplayValue={'username'}
                              handleOnChange={handleOnChangeSelectPack}
                              selectedValues={selectedUsers || ''}
                              handleOnClose={() => console.log('todo remove this')}
                              isReadOnly={!canEdit}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box>
                            <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Approval For :</InputLabel>
                          </Box>
                          <Box>
                          {approvalDetails?.approval_entities?.map((entity: any, entityIndex: any) => (
                            <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton size='small' color='primary'>
                                <CircleIcon fontSize='inherit' sx={{ mr: 1 }} />
                              </IconButton>
                              <Link
                                component="button"
                                variant="body2"
                                onClick={() => getDetailPageURL(entity?.task_frontend_link)}
                              >
                                <Typography variant="body2">{entity?.display_number}</Typography>
                              </Link>
                            </Box>
                          ))}
                          </Box>
                        </Grid>
                      </Grid>
                      <Grid container spacing={2} sx={{mt:1}}>
                        <Grid item xs={3}>
                          <Box>
                            <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Approval Description :</InputLabel>
                          </Box>
                          <Box>
                            {approvalDetails?.approval_name_display}
                          </Box>
                        </Grid>
                      </Grid>

                      <Grid container spacing={2} sx={{mt:1}}>
                        <Grid item xs={12}>
                          <Box>
                            <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Comments :</InputLabel>
                          </Box>
                          <Box>
                            <TextareaAutosize
                              id="comment"
                              name="order_quantity"
                              value={approvalComment}
                              onChange={(event) => handleChangeApprovalComment(event)}
                              minRows={4}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(0, 0, 0, 0.23)',
                                fontSize: '16px',
                                fontFamily: 'inherit',
                              }}
                            />
                          </Box>
                         <Box sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                            <Button variant='contained' onClick={handleSaveComments} disabled={approvalComment === ''} size='small' color='primary' >Post Comment</Button>
                          </Box>
                        <Box sx={{mt:1}}>
                          {approvalDetails?.taskcomment_set?.map((comment: any, commentIndex: any) => (
                            <Card key={`${keyHelper.getNextKeyValue()}`} sx={{ display: 'flex', mb: 2 }}>
                            <Box
                              sx={{
                                width: '5px',
                                backgroundColor: getColorForUser(comment.comment_user?.id),
                              }}
                            />
                            <CardContent sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 'bold', color:"primary.main" }}>
                                    {comment.comment_user?.user_name_display}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(comment.updated).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Tooltip title="Delete Comment" arrow>
                                    <IconButton size="small" color="primary" onClick={() => handleDeleteComment(comment.id)}>
                                      <DeleteForeverIcon style={{ color: '#d32f2f' }} />
                                    </IconButton>
                                </Tooltip>
                              </Box>
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2">{comment.comment}</Typography>
                              </Box>
                            </CardContent>
                          </Card>
                          ))}
                        </Box>
                        </Grid>
                      </Grid>
                    </Box>
              </RitzTabPanel>
            </TabContext>
          </Box>
        </>
      )}
    </>
  );
};

export default ApprovalDetails;