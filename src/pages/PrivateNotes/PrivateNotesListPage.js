import lodashGet from 'lodash/get';
import PropTypes from 'prop-types';
import React, {useEffect, useMemo} from 'react';
import {ScrollView} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import networkPropTypes from '@components/networkPropTypes';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {withNetwork} from '@components/OnyxProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import withLocalize, {withLocalizePropTypes} from '@components/withLocalize';
import useLocalize from '@hooks/useLocalize';
import compose from '@libs/compose';
import Navigation from '@libs/Navigation/Navigation';
import * as ReportUtils from '@libs/ReportUtils';
import * as UserUtils from '@libs/UserUtils';
import personalDetailsPropType from '@pages/personalDetailsPropType';
import reportPropTypes from '@pages/reportPropTypes';
import styles from '@styles/styles';
import * as Report from '@userActions/Report';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

const propTypes = {
    /** The report currently being looked at */
    report: reportPropTypes,
    route: PropTypes.shape({
        /** Params from the URL path */
        params: PropTypes.shape({
            /** reportID and accountID passed via route: /r/:reportID/notes */
            reportID: PropTypes.string,
            accountID: PropTypes.string,
        }),
    }).isRequired,

    /** Session info for the currently logged in user. */
    session: PropTypes.shape({
        /** Currently logged in user accountID */
        accountID: PropTypes.number,
    }),

    /** All of the personal details for everyone */
    personalDetailsList: PropTypes.objectOf(personalDetailsPropType),

    /** Information about the network */
    network: networkPropTypes.isRequired,
    ...withLocalizePropTypes,
};

const defaultProps = {
    report: {},
    session: {
        accountID: null,
    },
    personalDetailsList: {},
};

function PrivateNotesListPage({report, personalDetailsList, network, session}) {
    const {translate} = useLocalize();

    useEffect(() => {
        if (network.isOffline && report.isLoadingPrivateNotes) {
            return;
        }
        Report.getReportPrivateNote(report.reportID);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- do not add isLoadingPrivateNotes to dependencies
    }, [report.reportID, network.isOffline]);

    /**
     * Gets the menu item for each workspace
     *
     * @param {Object} item
     * @param {Number} index
     * @returns {JSX}
     */
    function getMenuItem(item, index) {
        const keyTitle = item.translationKey ? translate(item.translationKey) : item.title;

        return (
            <OfflineWithFeedback
                key={`${keyTitle}_${index}`}
                pendingAction={item.pendingAction}
                errorRowStyles={styles.ph5}
                onClose={item.dismissError}
                errors={item.errors}
            >
                <MenuItem
                    title={keyTitle}
                    icon={item.icon}
                    iconType={CONST.ICON_TYPE_WORKSPACE}
                    onPress={item.action}
                    shouldShowRightIcon
                    fallbackIcon={item.fallbackIcon}
                    brickRoadIndicator={item.brickRoadIndicator}
                />
            </OfflineWithFeedback>
        );
    }

    /**
     * Returns a list of private notes on the given chat report
     * @returns {Array} the menu item list
     */
    const privateNotes = useMemo(() => {
        const privateNoteBrickRoadIndicator = (accountID) => (!_.isEmpty(lodashGet(report, ['privateNotes', accountID, 'errors'], '')) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : '');
        return _.chain(lodashGet(report, 'privateNotes', {}))
            .map((privateNote, accountID) => ({
                title: Number(lodashGet(session, 'accountID', null)) === Number(accountID) ? translate('privateNotes.myNote') : lodashGet(personalDetailsList, [accountID, 'login'], ''),
                icon: UserUtils.getAvatar(lodashGet(personalDetailsList, [accountID, 'avatar'], UserUtils.getDefaultAvatar(accountID)), accountID),
                iconType: CONST.ICON_TYPE_AVATAR,
                action: () => Navigation.navigate(ROUTES.PRIVATE_NOTES_VIEW.getRoute(report.reportID, accountID)),
                brickRoadIndicator: privateNoteBrickRoadIndicator(accountID),
            }))
            .value();
    }, [report, personalDetailsList, session, translate]);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID={PrivateNotesListPage.displayName}
        >
            <FullPageNotFoundView
                shouldShow={
                    _.isEmpty(report.reportID) ||
                    (!report.isLoadingPrivateNotes && network.isOffline && _.isEmpty(lodashGet(report, 'privateNotes', {}))) ||
                    ReportUtils.isArchivedRoom(report)
                }
            >
                <HeaderWithBackButton
                    title={translate('privateNotes.title')}
                    shouldShowBackButton
                    onCloseButtonPress={() => Navigation.dismissModal()}
                />
                <ScrollView contentContainerStyle={styles.flexGrow1}>
                    {report.isLoadingPrivateNotes && _.isEmpty(lodashGet(report, 'privateNotes', {})) ? (
                        <FullScreenLoadingIndicator style={[styles.flex1, styles.pRelative]} />
                    ) : (
                        _.map(privateNotes, (item, index) => getMenuItem(item, index))
                    )}
                </ScrollView>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

PrivateNotesListPage.propTypes = propTypes;
PrivateNotesListPage.defaultProps = defaultProps;
PrivateNotesListPage.displayName = 'PrivateNotesListPage';

export default compose(
    withLocalize,
    withOnyx({
        report: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT}${route.params.reportID.toString()}`,
        },
        session: {
            key: ONYXKEYS.SESSION,
        },
        personalDetailsList: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
    }),
    withNetwork(),
)(PrivateNotesListPage);
