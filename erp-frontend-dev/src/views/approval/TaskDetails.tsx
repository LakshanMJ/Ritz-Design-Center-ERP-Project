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
import { approvalStateChangeURL, usersURL, taskDetailsURL, TaskStatusListURL, taskDetailsSaveURL, approvalCommentSaveURL, approvalCommentDeleteURL, apiBaseURL } from '@/helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import CircleIcon from '@mui/icons-material/Circle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import CircularLoader from '@/components/CircularLoader';
import {MERCHANT_ADMIN} from "@/helpers/constants/RoleManager";
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';
const TaskDetails = ({ taskId, taskType }: any) => {
  const router = useRouter();
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingChoices, setIsSavingChoices] = useState(false); 
  const keyHelper = new ReactKeyHelper();
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [taskDetails, setTaskDetails] = useState<any>({});
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedUsers, setSelectedUsers] = useState<any>([]);
  const [tasksStatus, setTasksStatus] = useState<any>([]);
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
      api.get(taskDetailsURL(taskId)),
      api.get(TaskStatusListURL()),

    ];

    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [users, taskDetails, taskStatus] = respData;
      setUsers(users)
      setTaskDetails({ ...taskDetails })
      setTasksStatus([...taskStatus])
      setSelectedUsers([...taskDetails.assigned_users])

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

  const handleChoicesChange = (choice: any) => {
    setIsSavingChoices(true)
    setIsLoadingCircularLoader(true);
    api.post(approvalStateChangeURL(taskId), { approval_status: choice }).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSavingComment(false));

  }

  const handleChangeState = (event: any, field: any) => {
    setTaskDetails((prevState: any) => ({
      ...prevState,
      [field]: event.target.value
    }));
  };

  const getDetailPageURL = (frontEndURL: string) => {
    router.push(`/${frontEndURL}`);
  };

  const handleSaveAdminChanges =()=>{
    const saveData = {
      assign_users: selectedUsers,
      task_state: taskDetails.task_state,
      action_user: taskDetails.action_user
    }
    api.post(taskDetailsSaveURL(taskId), saveData).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSavingComment(false));

  }
  const handleChangeApprovalComment = (event: any)=>{
    setApprovalComment(event.target.value)
  }
  const handleSaveComments = () => {
    if (approvalComment !== '') {
      setIsSavingComment(true)
      setIsLoadingCircularLoader(true);
      api.post(approvalCommentSaveURL(taskId), { comment: approvalComment }).then(resp => {
        toast.success(DEFAULT_SUCCESS);
        fetchData()
        setApprovalComment("")
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsSavingComment(false));
    }
  }
  const getColorForUser = (userId: number) => {
    return ColorHelper[userId % ColorHelper.length];
  };
  
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
  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  useEffect(() => {
    if (taskId) {
      fetchData()
    }
  }, [taskId]);

  return (
    <>
      {isLoadingCircularLoader && (<CircularLoader />)}

      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <RitzBreadcrumbs
            items={[
              { label: 'Task List', url: taskType=='my_tasks'? '/tasks/my_tasks':'/tasks/all_tasks' },
              { label: 'Task Details' },
            ]}
            title={"Task Details"}
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
                {taskDetails?.action == 'pending' && (
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
                <RitzTabs tabs={['Task Details']} activeTab={activeTab} emitChange={handleChangeTabs} />
              </Box>
              <RitzTabPanel value='1' sx={{ pt: 2 }}>
                  <Grid container columnSpacing={2} rowSpacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography sx={{ fontWeight: 'bold' }}>Task No:</Typography>
                      <Typography>{taskDetails?.display_number}</Typography>
                    </Grid>
                    <Divider orientation="vertical" flexItem sx={{ mt:2 }} />
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography sx={{ fontWeight: 'bold' }}>Task Type:</Typography>
                      <Typography>{taskDetails?.description}</Typography>
                    </Grid>
                    <Divider orientation="vertical" flexItem sx={{ mt:2 }}  />
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography sx={{ fontWeight: 'bold' }}>Created Date:</Typography>
                      <Typography>{taskDetails?.created}</Typography>
                    </Grid>
                  </Grid>
                    <Divider sx={{ p:2}}/>
                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>State:</InputLabel>
                        </Box>
                        <Box>
                          <RitzSelection
                            id={'state'}
                            name={'state'}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={taskDetails?.task_state}
                            isRequired={true}
                            options={tasksStatus}
                            handleOnChange={(event: any) => handleChangeState(event, 'task_state')}
                            isReadOnly={!canEdit}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Action User:</InputLabel>
                        </Box>
                        <Box>
                          <RitzSelection
                            id={'action_user'}
                            name={'action_user'}
                            optionValue={'id'}
                            optionText={'username'}
                            selectedValue={taskDetails?.action_user}
                            isRequired={true}
                            options={users}
                            handleOnChange={(event: any) => handleChangeState(event, 'action_user')}
                            isReadOnly={!canEdit}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Task For:</InputLabel>
                        </Box>
                        <Box>
                          {taskDetails?.task_entities?.map((entity: any) => (
                            <Box key={keyHelper.getNextKeyValue()} sx={{ display: 'flex', alignItems: 'center' }}>
                                <CircleIcon fontSize="inherit" sx={{ mr: 1 }} />
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
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Task Description:</InputLabel>
                        </Box>
                        <Box>{taskDetails?.description}</Box>
                      </Grid>
                    </Grid>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Assigned Users:</InputLabel>
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
                    </Grid>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        <Box>
                          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Comments:</InputLabel>
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
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                          <Button
                            variant="contained"
                            onClick={handleSaveComments}
                            disabled={approvalComment === ''}
                            size="small"
                            color="primary"
                          >
                            Post Comment
                          </Button>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          {taskDetails?.taskcomment_set?.map((comment: any) => (
                            <Card key={keyHelper.getNextKeyValue()} sx={{ display: 'flex', mb: 2 }}>
                              <Box sx={{ width: '5px', backgroundColor: getColorForUser(comment.comment_user?.id) }} />
                              <CardContent sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      {comment?.comment_user?.user_name_display}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {new Date(comment?.updated).toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Delete Comment" arrow>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleDeleteComment(comment.id)}
                                    >
                                      <DeleteForeverIcon style={{ color: '#d32f2f' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="body2">{comment?.comment}</Typography>
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

export default TaskDetails;