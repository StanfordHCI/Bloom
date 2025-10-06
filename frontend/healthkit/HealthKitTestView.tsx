import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

import { testAllSampleTypes,
    testParameterInputs,
    testNaturalLanguage,
    testQueriesErrorAndEdgeCases,
    testBoundaryConditions,
    TestQueryType,
} from './HealthKitTestQueries';
import { queryHealthKit } from './queryHealthKit';

interface HKResult {
    description: string;
    parameters: TestQueryType["parameters"];
    data?: string;
    error?: string;
    loading: boolean;
}

const HealthKitTestView = () => {
    const testCategories = [
        { title: 'All Sample Types', tests: testAllSampleTypes },
        { title: 'Parameter Inputs', tests: testParameterInputs },
        { title: 'Natural Language Queries', tests: testNaturalLanguage },
        { title: 'Error and Edge Cases', tests: testQueriesErrorAndEdgeCases },
        { title: 'Boundary Conditions', tests: testBoundaryConditions },
    ];

    const [results, setResults] = useState<HKResult[]>(
        testCategories.flatMap((category) =>
            category.tests.map((test) => ({
                description: test.description,
                parameters: test.parameters,
                loading: false,
            }))
        )
    );

    const executeTest = async (index: number) => {
        setResults((prevResults) => {
            const newResults = [...prevResults];
            newResults[index] = { ...newResults[index], loading: true };
            return newResults;
        });

        const test = results[index];

        try {
            console.log('Running test: ', test.description);
            console.log('Parameters: ', test.parameters);

            // @ts-expect-error TS2345
            const data = await queryHealthKit(test.parameters);
            console.log('Data: ', data);

            setResults((prevResults) => {
                const newResults = [...prevResults];
                newResults[index] = { ...newResults[index], data, loading: false };
                return newResults;
            });
        } catch (error) {
            const errorMessage = (error as Error).message || String(error);
            setResults((prevResults) => {
                const newResults = [...prevResults];
                newResults[index] = {
                    ...newResults[index],
                    error: errorMessage,
                    loading: false,
                };
                return newResults;
            });
        }
    };

    const executeAllTests = async () => {
        for (let i = 0; i < results.length; i++) {
            await executeTest(i);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity style={styles.runAllButton} onPress={() => void executeAllTests()}>
                <Text style={styles.runAllButtonText}>Run All Queries</Text>
            </TouchableOpacity>
            {testCategories.map((category, categoryIndex) => (
                <View key={categoryIndex} style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    {category.tests.map((_, testIndex) => {
                        const resultIndex =
                            testCategories.slice(0, categoryIndex).flatMap((c) => c.tests).length + testIndex;
                        const result = results[resultIndex];

                        return (
                            <View key={resultIndex} style={styles.resultContainer}>
                                <Text style={styles.title}>{result.description}</Text>
                                <Text style={styles.subtitle}>Parameters:</Text>
                                <Text style={styles.codeBlock}>{JSON.stringify(result.parameters, null, 2)}</Text>

                                {result.loading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#007AFF" />
                                        <Text style={styles.loadingText}>Executing...</Text>
                                    </View>
                                ) : result.data || result.error ? (
                                    <>
                                        {result.error ? (
                                            <Text style={styles.errorText}>Error: {result.error}</Text>
                                        ) : (
                                            <>
                                                <Text style={styles.subtitle}>Response:</Text>
                                                <Text style={styles.codeBlock}>
                                                    {result.data}
                                                </Text>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={() => void executeTest(resultIndex)}
                                    >
                                        <Text style={styles.buttonText}>Run Query</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );
};

export default HealthKitTestView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    categoryContainer: {
        marginBottom: 32,
    },
    categoryTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    resultContainer: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#CCC',
        paddingBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    codeBlock: {
        fontFamily: 'Courier',
        fontSize: 14,
        backgroundColor: '#F0F0F0',
        padding: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    errorText: {
        color: 'red',
        marginTop: 8,
    },
    button: {
        marginTop: 12,
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    runAllButton: {
        marginBottom: 16,
        backgroundColor: '#28A745',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 6,
        alignSelf: 'center',
    },
    runAllButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
