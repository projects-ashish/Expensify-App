import {useRoute} from '@react-navigation/native';
import type {FlashListProps} from '@shopify/flash-list';
import {FlashList} from '@shopify/flash-list';
import type {ReactElement} from 'react';
import React, {memo, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import BlockingView from '@components/BlockingViews/BlockingView';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import LottieAnimations from '@components/LottieAnimations';
import {ScrollOffsetContext} from '@components/ScrollOffsetContextProvider';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import usePermissions from '@hooks/usePermissions';
import usePrevious from '@hooks/usePrevious';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import * as DraftCommentUtils from '@libs/DraftCommentUtils';
import * as ReportActionsUtils from '@libs/ReportActionsUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import OptionRowLHNData from './OptionRowLHNData';
import type {LHNOptionsListProps, RenderItemProps} from './types';

const keyExtractor = (item: string) => `report_${item}`;

function LHNOptionsList({style, contentContainerStyles, data, onSelectRow, optionMode, shouldDisableFocusOptions = false, onFirstItemRendered = () => {}}: LHNOptionsListProps) {
    const {saveScrollOffset, getScrollOffset} = useContext(ScrollOffsetContext);
    const flashListRef = useRef<FlashList<string>>(null);
    const route = useRoute();

    const [reports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const [reportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const [policy] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST);
    const [transactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION);
    const [draftComments] = useOnyx(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT);
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);

    const theme = useTheme();
    const styles = useThemeStyles();
    const {canUseViolations} = usePermissions();
    const {translate, preferredLocale} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const shouldShowEmptyLHN = shouldUseNarrowLayout && data.length === 0;

    // When the first item renders we want to call the onFirstItemRendered callback.
    // At this point in time we know that the list is actually displaying items.
    const hasCalledOnLayout = React.useRef(false);
    const onLayoutItem = useCallback(() => {
        if (hasCalledOnLayout.current) {
            return;
        }
        hasCalledOnLayout.current = true;

        onFirstItemRendered();
    }, [onFirstItemRendered]);

    const emptyLHNSubtitle = useMemo(
        () => (
            <View>
                <Text
                    color={theme.placeholderText}
                    style={[styles.textAlignCenter]}
                >
                    {translate('common.emptyLHN.subtitleText1')}
                    <Icon
                        src={Expensicons.MagnifyingGlass}
                        width={variables.emptyLHNIconWidth}
                        height={variables.emptyLHNIconHeight}
                        small
                        inline
                        fill={theme.icon}
                        additionalStyles={styles.alignItemsCenter}
                    />
                    {translate('common.emptyLHN.subtitleText2')}
                    <Icon
                        src={Expensicons.Plus}
                        width={variables.emptyLHNIconWidth}
                        height={variables.emptyLHNIconHeight}
                        small
                        inline
                        fill={theme.icon}
                        additionalStyles={styles.alignItemsCenter}
                    />
                    {translate('common.emptyLHN.subtitleText3')}
                </Text>
            </View>
        ),
        [theme, styles.alignItemsCenter, styles.textAlignCenter, translate],
    );

    /**
     * Function which renders a row in the list
     */
    const renderItem = useCallback(
        ({item: reportID}: RenderItemProps): ReactElement => {
            const itemFullReport = reports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
            const itemReportActions = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`];
            const itemParentReportActions = reportActions?.[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${itemFullReport?.parentReportID}`];
            const itemParentReportAction = itemParentReportActions?.[itemFullReport?.parentReportActionID ?? '-1'];
            const itemPolicy = policy?.[`${ONYXKEYS.COLLECTION.POLICY}${itemFullReport?.policyID}`];
            const transactionID = itemParentReportAction?.actionName === CONST.REPORT.ACTIONS.TYPE.IOU ? itemParentReportAction.originalMessage.IOUTransactionID ?? '-1' : '-1';
            const itemTransaction = transactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`];
            const hasDraftComment = DraftCommentUtils.isValidDraftComment(draftComments?.[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`]);
            const sortedReportActions = ReportActionsUtils.getSortedReportActionsForDisplay(itemReportActions);
            const lastReportAction = sortedReportActions[0];

            // Get the transaction for the last report action
            let lastReportActionTransactionID = '';

            if (lastReportAction?.actionName === CONST.REPORT.ACTIONS.TYPE.IOU) {
                lastReportActionTransactionID = lastReportAction.originalMessage?.IOUTransactionID ?? '-1';
            }
            const lastReportActionTransaction = transactions?.[`${ONYXKEYS.COLLECTION.TRANSACTION}${lastReportActionTransactionID}`] ?? {};

            return (
                <OptionRowLHNData
                    reportID={reportID}
                    fullReport={itemFullReport}
                    reportActions={itemReportActions}
                    parentReportAction={itemParentReportAction}
                    policy={itemPolicy}
                    personalDetails={personalDetails ?? {}}
                    transaction={itemTransaction}
                    lastReportActionTransaction={lastReportActionTransaction}
                    receiptTransactions={transactions}
                    viewMode={optionMode}
                    isFocused={!shouldDisableFocusOptions}
                    onSelectRow={onSelectRow}
                    preferredLocale={preferredLocale}
                    hasDraftComment={hasDraftComment}
                    transactionViolations={transactionViolations}
                    canUseViolations={canUseViolations}
                    onLayout={onLayoutItem}
                />
            );
        },
        [
            draftComments,
            onSelectRow,
            optionMode,
            personalDetails,
            policy,
            preferredLocale,
            reportActions,
            reports,
            shouldDisableFocusOptions,
            transactions,
            transactionViolations,
            canUseViolations,
            onLayoutItem,
        ],
    );

    const extraData = useMemo(
        () => [reportActions, reports, policy, personalDetails, data.length, draftComments, optionMode],
        [reportActions, reports, policy, personalDetails, data.length, draftComments, optionMode],
    );

    const previousOptionMode = usePrevious(optionMode);

    useEffect(() => {
        if (previousOptionMode === null || previousOptionMode === optionMode || !flashListRef.current) {
            return;
        }

        if (!flashListRef.current) {
            return;
        }

        // If the option mode changes want to scroll to the top of the list because rendered items will have different height.
        flashListRef.current.scrollToOffset({offset: 0});
    }, [previousOptionMode, optionMode]);

    const onScroll = useCallback<NonNullable<FlashListProps<string>['onScroll']>>(
        (e) => {
            // If the layout measurement is 0, it means the flashlist is not displayed but the onScroll may be triggered with offset value 0.
            // We should ignore this case.
            if (e.nativeEvent.layoutMeasurement.height === 0) {
                return;
            }
            saveScrollOffset(route, e.nativeEvent.contentOffset.y);
        },
        [route, saveScrollOffset],
    );

    const onLayout = useCallback(() => {
        const offset = getScrollOffset(route);

        if (!(offset && flashListRef.current)) {
            return;
        }

        // We need to use requestAnimationFrame to make sure it will scroll properly on iOS.
        requestAnimationFrame(() => {
            if (!(offset && flashListRef.current)) {
                return;
            }
            flashListRef.current.scrollToOffset({offset});
        });
    }, [route, flashListRef, getScrollOffset]);

    return (
        <View style={[style ?? styles.flex1, shouldShowEmptyLHN ? styles.emptyLHNWrapper : undefined]}>
            {shouldShowEmptyLHN ? (
                <BlockingView
                    animation={LottieAnimations.Fireworks}
                    animationStyles={styles.emptyLHNAnimation}
                    animationWebStyle={styles.emptyLHNAnimation}
                    title={translate('common.emptyLHN.title')}
                    shouldShowLink={false}
                    CustomSubtitle={emptyLHNSubtitle}
                />
            ) : (
                <FlashList
                    ref={flashListRef}
                    indicatorStyle="white"
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={StyleSheet.flatten(contentContainerStyles)}
                    data={data}
                    testID="lhn-options-list"
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    estimatedItemSize={optionMode === CONST.OPTION_MODE.COMPACT ? variables.optionRowHeightCompact : variables.optionRowHeight}
                    extraData={extraData}
                    showsVerticalScrollIndicator={false}
                    onLayout={onLayout}
                    onScroll={onScroll}
                />
            )}
        </View>
    );
}

LHNOptionsList.displayName = 'LHNOptionsList';

export default memo(LHNOptionsList);

export type {LHNOptionsListProps};
