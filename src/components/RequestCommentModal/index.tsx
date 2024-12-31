/* eslint-disable @typescript-eslint/no-unused-vars */
import Button from '@app/components/Common/Button';
import Modal from '@app/components/Common/Modal';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import type Media from '@server/entity/Media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import type { NonFunctionProperties } from '@server/interfaces/api/common';
import type { MovieDetails } from '@server/models/Movie';
import type { TvDetails } from '@server/models/Tv';
import { Field, Form, Formik } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import * as Yup from 'yup';

const messages = defineMessages('components.RequestCommentModal', {
  leaveComment: "Leave a comment for {username}'s request.",
});

interface RequestCommentModalProps {
  show: boolean;
  type: 'movie' | 'tv' | 'collection';
  tmdbId?: number;
  mediaInfo?: Media;
  request?: NonFunctionProperties<MediaRequest>;
  onComplete?: (newStatus: MediaStatus, comment: string) => void;
  onCancel?: () => void;
}

const RequestCommentModal = ({
  type,
  show,
  tmdbId,
  mediaInfo,
  request,
  onComplete,
  onCancel,
}: RequestCommentModalProps) => {
  const intl = useIntl();
  const { user, hasPermission } = useUser();
  const [requestComment, setRequestComment] = useState('');

  const [data, setData] = useState<TvDetails | MovieDetails | null>(null);
  const [error, setError] = useState(null);

  // All pending requests
  const activeRequests = mediaInfo?.requests.filter(
    (request) => request.status === MediaRequestStatus.PENDING && !request.is4k
  );

  // Current user's pending request, or the first pending request
  const activeRequest = useMemo(() => {
    return activeRequests && activeRequests.length > 0
      ? activeRequests.find((request) => request.requestedBy.id === user?.id) ??
          activeRequests[0]
      : undefined;
  }, [activeRequests, user]);

  const CommentSchema = Yup.object().shape({
    message: Yup.string(),
  });

  useEffect(() => {
    (async () => {
      if (!show) return;
      try {
        setError(null);
        const response = await fetch(`/api/v1/${type}/${tmdbId}`);
        if (!response.ok) {
          throw new Error();
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err);
      }
    })();
  }, [show, tmdbId, type]);

  return (
    <Transition
      as="div"
      enter="transition-opacity duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={show}
    >
      <Modal
        loading={false}
        backgroundClickable
        title={'Reason for declining?'}
        subTitle={intl.formatMessage(messages.leaveComment, {
          username: activeRequest?.requestedBy.displayName ?? '',
        })}
      >
        {
          <Formik
            initialValues={{
              message: '',
            }}
            validationSchema={CommentSchema}
            onSubmit={async (values, { resetForm }) => {
              // const res = await fetch(
              //   `/api/v1/issue/${issueData?.id}/comment`,
              //   {
              //     method: 'POST',
              //     headers: {
              //       'Content-Type': 'application/json',
              //     },
              //     body: JSON.stringify({ message: values.message }),
              //   }
              // );
              // if (!res.ok) throw new Error();
              // revalidateIssue();
              resetForm();
            }}
          >
            {({ isValid, isSubmitting, values, handleSubmit }) => {
              return (
                <Form>
                  <div className="my-6">
                    <Field
                      id="message"
                      name="message"
                      as="textarea"
                      placeholder={
                        'Optionally leave a comment for the request.'
                      }
                      className="h-20"
                    />
                    <div className="mt-4 flex items-center justify-end space-x-2">
                      {
                        <Button
                          type="button"
                          buttonType="default"
                          onClick={async () => {
                            // await updateIssueStatus('resolved');

                            if (values.message) {
                              handleSubmit();
                            }
                          }}
                        >
                          <span>{'Cancel'}</span>
                        </Button>
                      }
                      <Button
                        type="submit"
                        buttonType="danger"
                        disabled={!isValid || isSubmitting}
                      >
                        <span>{'Decline Request'}</span>
                      </Button>
                    </div>
                  </div>
                </Form>
              );
            }}
          </Formik>
        }
      </Modal>
    </Transition>
  );
};

export default RequestCommentModal;
