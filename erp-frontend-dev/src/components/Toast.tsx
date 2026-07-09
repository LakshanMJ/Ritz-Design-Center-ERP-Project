import { ToastBar, Toaster, toast } from 'react-hot-toast';

const Toast = () => (
    <Toaster
        position='top-right'
        toastOptions={{
            duration: 6000,
            success: {
                duration: 3000
            }
        }}
    >
        {(t) => (
            <ToastBar
                toast={t}
                style={{
                    padding: 0
                }}
            >
                {({ icon, message }) => (
                    <span
                        style={{
                            display: 'flex',
                            padding: '8px 10px',
                            cursor: 'pointer'
                        }}
                        onClick={() => toast.dismiss(t.id)}
                    >
                        {icon}
                        {message}
                    </span>
                )}
            </ToastBar>
        )}
    </Toaster>
)

export default Toast;