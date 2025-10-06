import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../../context/ThemeContext";

interface ExpandableSectionProps {
    title: string;
    content: string[];
    icon?: string;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({ title, content, icon }) => {
    const [expanded, setExpanded] = useState(false);
    const { theme } = useTheme();

    return (
        <View style={styles.sectionContainer}>
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setExpanded(!expanded)}
            >
                {icon && (
                    <SFSymbol
                        name={icon}
                        weight="medium"
                        scale="medium"
                        color={theme.colors.primary}
                        style={styles.icon}
                    />
                )}
                <Text style={styles.sectionTitle}>{title}</Text>
                <SFSymbol
                    name={expanded ? 'chevron.down' : 'chevron.right'}
                    weight="medium"
                    style={styles.chevron}
                    color={theme.colors.textDisabled}
                />
            </TouchableOpacity>
            {expanded && (
                <View style={styles.contentContainer}>
                    {content.map((item, index) => (
                        <Text key={index} style={styles.contentItem}>
                            {(title === 'Health Data Collection' && (index === 0))
                                ? item
                                : `• ${item}`}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    chevron: {
        width: 20,
        height: 20,
    },
    contentContainer: {
        padding: 16,
        paddingTop: 0,
    },
    contentItem: {
        fontSize: 14,
        marginBottom: 8,
    },
});

export default ExpandableSection;
