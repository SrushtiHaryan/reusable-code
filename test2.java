package com.db.mbms.evault.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;
import jakarta.persistence.EntityManagerFactory;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;

@SpringBootTest(classes = EmbtrustDatabaseConfig.class)
@ActiveProfiles("test") // Assuming you have a test profile
class EmbtrustDatabaseConfigTest {

    @Autowired
    private EmbtrustDatabaseConfig embtrustDatabaseConfig;

    @Test
    void testEmbTrustDatabaseDataSource() {
        DataSource dataSource = embtrustDatabaseConfig.enbTrustDatabaseDataSource();
        assertThat(dataSource).isNotNull();
    }

    @Test
    void testEmbTrustEntityManagerFactory() {
        LocalContainerEntityManagerFactoryBean factoryBean = embtrustDatabaseConfig.embTrustEntityManagerFactory(
                new org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder(
                        new org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter(),
                        embtrustDatabaseConfig.getHibernateProperties(),
                        null
                ),
                embtrustDatabaseConfig.enbTrustDatabaseDataSource()
        );
        assertThat(factoryBean).isNotNull();
        assertThat(factoryBean.getPersistenceUnitName()).isEqualTo("enbtrust");
    }

    @Test
    void testEmbTrustTransactionManager() {
        LocalContainerEntityManagerFactoryBean factoryBean = embtrustDatabaseConfig.embTrustEntityManagerFactory(
                new org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder(
                        new org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter(),
                        embtrustDatabaseConfig.getHibernateProperties(),
                        null
                ),
                embtrustDatabaseConfig.enbTrustDatabaseDataSource()
        );
        factoryBean.afterPropertiesSet();
        EntityManagerFactory emf = factoryBean.getObject();

        PlatformTransactionManager transactionManager = embtrustDatabaseConfig.embTrustTransactionManager(emf);
        assertThat(transactionManager).isInstanceOf(JpaTransactionManager.class);
    }
}
